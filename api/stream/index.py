






import json
import os
import time
import subprocess
import asyncio
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs


_stream_cache = {}

_inflight = {}

CACHE_TTL = 2 * 60 * 60
EXPIRE_MARGIN = 5 * 60   # 5 minutes before URL's own expiry
MAX_EXTRACT_ATTEMPTS = 3

YTDLP_BASE = [
    "python", "-m", "yt_dlp",
    "--no-playlist",
    "--no-warnings",
    "--no-update",
    "-f", "bestaudio[ext=m4a]/bestaudio",
    "-g",
]


YTDLP_CLIENTS = [
    [],
    ["--extractor-args", "youtube:player_client=web_embedded"],
    ["--extractor-args", "youtube:player_client=ios"],
    ["--extractor-args", "youtube:player_client=android"],
    ["--extractor-args", "youtube:player_client=tv"],
]

def url_expiry(url: str) -> int | None:
    """Extract the `expire` timestamp from a googlevideo URL."""
    try:
        qs = parse_qs(urlparse(url).query)
        ts = qs.get("expire", [None])[0]
        if ts:
            ms = int(ts) * 1000
            if ms > 0:
                return ms
    except Exception:
        pass
    return None

def expire_at(url: str) -> int:
    now = int(time.time() * 1000)
    own = url_expiry(url)
    if own:
        return min(own - EXPIRE_MARGIN * 1000, now + CACHE_TTL * 1000)
    return now + CACHE_TTL * 1000

async def extract_url(video_id: str) -> tuple[str, str]:
    """Run yt-dlp to get a direct audio URL. Returns (url, mime)."""
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    last_err = None
    for extra in YTDLP_CLIENTS:
        cmd = YTDLP_BASE + extra + [watch_url]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=20)
            if proc.returncode == 0:
                url = stdout.decode().strip().split("\n")[-1].strip()
                if url and url.startswith("http"):
                    mime = "audio/mp4"
                    return url, mime
            last_err = stderr.decode().strip() or f"exit {proc.returncode}"
        except asyncio.TimeoutError:
            last_err = "timeout"
        except Exception as e:
            last_err = str(e)
    raise RuntimeError(f"yt-dlp failed: {last_err}")

async def resolve_stream(video_id: str) -> dict:
    """Get a fresh or cached stream entry for video_id."""
    now = int(time.time() * 1000)
    hit = _stream_cache.get(video_id)
    if hit and hit["expires"] > now:
        return hit

    if video_id in _inflight:
        return await _inflight[video_id]

    async def _make_entry():
        url, mime = await extract_url(video_id)
        entry = {"url": url, "mime": mime, "expires": expire_at(url), "attempt": 0}
        _stream_cache[video_id] = entry
        return entry

    task = asyncio.create_task(_make_entry())
    _inflight[video_id] = task
    try:
        return await task
    finally:
        _inflight.pop(video_id, None)

class handler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        """Handle HEAD requests — browsers send these for audio preload/metadata.
        Must forward Range header to upstream to get proper Content-Range/Content-Length."""
        qs = parse_qs(urlparse(self.path).query)
        video_id = qs.get("videoId", [""])[0].strip()
        if "&" in video_id:
            video_id = video_id.split("&")[0]
        if not video_id or not all(c.isalnum() or c in "-_" for c in video_id) or len(video_id) != 11:
            self._json(400, {"error": "videoId is required"})
            return

        range_header = self.headers.get("Range", "bytes=0-")

        try:
            entry = asyncio.run(resolve_stream(video_id))
        except Exception as e:
            self._json(502, {"error": "stream unavailable", "reason": str(e)[:200]})
            return


        import urllib.request
        req = urllib.request.Request(entry["url"], headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Range": range_header,
            "Accept-Encoding": "identity",
        }, method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=30) as upstream:
                if upstream.status not in (200, 206):
                    raise RuntimeError(f"upstream {upstream.status}")
                self.send_response(upstream.status)
                self.send_header("Content-Type", upstream.headers.get("Content-Type", entry["mime"]))
                self.send_header("Accept-Ranges", "bytes")
                if upstream.headers.get("Content-Range"):
                    self.send_header("Content-Range", upstream.headers.get("Content-Range"))
                if upstream.headers.get("Content-Length") and not upstream.headers.get("Content-Encoding"):
                    self.send_header("Content-Length", upstream.headers.get("Content-Length"))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                return
        except Exception as e:
            print(f"stream: HEAD upstream error {video_id} {e}")


        self.send_response(200)
        self.send_header("Content-Type", entry["mime"])
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        video_id = qs.get("videoId", [""])[0].strip()

        if "&" in video_id:
            video_id = video_id.split("&")[0]
        if not video_id or not all(c.isalnum() or c in "-_" for c in video_id) or len(video_id) != 11:
            self._json(400, {"error": "videoId is required"})
            return


        try:
            entry = asyncio.run(resolve_stream(video_id))
        except Exception as e:
            self._json(502, {"error": "stream unavailable", "reason": str(e)[:200]})
            return


        range_header = self.headers.get("Range", "bytes=0-")



        for attempt in range(MAX_EXTRACT_ATTEMPTS):
            try:
                import urllib.request
                req = urllib.request.Request(entry["url"], headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Range": range_header,


                    "Accept-Encoding": "identity",
                })
                with urllib.request.urlopen(req, timeout=30) as upstream:
                    if upstream.status not in (200, 206):
                        raise RuntimeError(f"upstream {upstream.status}")
                    self.send_response(upstream.status)
                    self.send_header("Content-Type", upstream.headers.get("Content-Type", entry["mime"]))
                    self.send_header("Accept-Ranges", "bytes")
                    if upstream.headers.get("Content-Range"):
                        self.send_header("Content-Range", upstream.headers.get("Content-Range"))

                    if upstream.headers.get("Content-Length") and not upstream.headers.get("Content-Encoding"):
                        self.send_header("Content-Length", upstream.headers.get("Content-Length"))
                    self.send_header("Cache-Control", "no-store")
                    self.end_headers()

                    while True:
                        chunk = upstream.read(65536)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                    return
            except Exception as e:

                print(f"stream: upstream error {video_id} {e} (attempt {attempt+1}/{MAX_EXTRACT_ATTEMPTS})")
                _stream_cache.pop(video_id, None)
                try:
                    entry = asyncio.run(resolve_stream(video_id))
                except Exception as e2:
                    print(f"stream: re-extract failed {video_id}: {e2}")
                    break

        self._json(502, {"error": "upstream unavailable"})

    def _json(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())



handler = handler
