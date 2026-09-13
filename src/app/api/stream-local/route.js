import { NextResponse } from "next/server";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import https from "https";
import http from "http";

const execFileAsync = promisify(execFile);


const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; 
const EXPIRE_MARGIN_MS = 5 * 60 * 1000;   




const YTDLP_CANDIDATES = [
  "yt-dlp",
  path.join(process.env.HOME || "/root", ".local/bin/yt-dlp"),
  "/usr/local/bin/yt-dlp",
  "/usr/bin/yt-dlp",
];



const YTDLP_MODULE_CANDIDATES = [
  ["python", "-m", "yt_dlp"],
  ["python3", "-m", "yt_dlp"],
];

let _ytdlpBin = null;
async function findYtdlp() {
  if (_ytdlpBin) return _ytdlpBin;
  for (const bin of YTDLP_CANDIDATES) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5000 });
      _ytdlpBin = bin;
      return bin;
    } catch {}
  }
  
  for (const moduleCmd of YTDLP_MODULE_CANDIDATES) {
    try {
      await execFileAsync(moduleCmd[0], [...moduleCmd.slice(1), "--version"], { timeout: 8000 });
      _ytdlpBin = moduleCmd; 
      return moduleCmd;
    } catch {}
  }
  return null;
}


function getUrlExpiry(url) {
  try {
    const exp = new URL(url).searchParams.get("expire");
    if (exp) return parseInt(exp, 10) * 1000;
  } catch {}
  return null;
}

function cacheExpiresAt(url) {
  const own = getUrlExpiry(url);
  const now = Date.now();
  if (own) return Math.min(own - EXPIRE_MARGIN_MS, now + CACHE_TTL_MS);
  return now + CACHE_TTL_MS;
}


const CLIENTS = [
  [],
  ["--extractor-args", "youtube:player_client=web_embedded"],
  ["--extractor-args", "youtube:player_client=ios"],
  ["--extractor-args", "youtube:player_client=android"],
  ["--extractor-args", "youtube:player_client=tv"],
];

async function extractAudioUrl(videoId) {
  const bin = await findYtdlp();
  if (!bin) throw new Error("yt-dlp not found — install it with: pip install yt-dlp");

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let lastErr = null;

  
  const isModule = Array.isArray(bin);
  const execBin = isModule ? bin[0] : bin;

  for (const extra of CLIENTS) {
    const ytdlpArgs = [
      "--no-playlist",
      "--no-warnings",
      "--no-update",
      "-f", "bestaudio[ext=m4a]/bestaudio",
      "-g",
      ...extra,
      watchUrl,
    ];
    
    const args = isModule ? [...bin.slice(1), ...ytdlpArgs] : ytdlpArgs;

    try {
      const { stdout } = await execFileAsync(execBin, args, { timeout: 25000 });
      const url = stdout.trim().split("\n").pop().trim();
      if (url && url.startsWith("http")) {
        return { url, mime: "audio/mp4" };
      }
      lastErr = "no URL in output";
    } catch (err) {
      lastErr = err.message || String(err);
    }
  }
  throw new Error(`yt-dlp extraction failed: ${lastErr}`);
}


const inflight = new Map();

async function resolveStream(videoId) {
  const now = Date.now();
  const hit = cache.get(videoId);
  if (hit && hit.expiresAt > now) return hit;

  if (inflight.has(videoId)) return inflight.get(videoId);

  const promise = extractAudioUrl(videoId).then(({ url, mime }) => {
    const entry = { url, mime, expiresAt: cacheExpiresAt(url) };
    cache.set(videoId, entry);
    inflight.delete(videoId);
    return entry;
  }).catch(err => {
    inflight.delete(videoId);
    throw err;
  });

  inflight.set(videoId, promise);
  return promise;
}


function proxyRequest(method, upstreamUrl, rangeHeader) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(upstreamUrl);
    const lib = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Range": rangeHeader || "bytes=0-",
        "Accept-Encoding": "identity",
      },
    };
    const req = lib.request(options, resolve);
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(new Error("upstream timeout")); });
    req.end();
  });
}


function isValidVideoId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let videoId = searchParams.get("videoId") || "";

  if (videoId.includes("&")) videoId = videoId.split("&")[0];

  if (!isValidVideoId(videoId)) {
    return NextResponse.json({ error: "videoId is required (11 chars)" }, { status: 400 });
  }

  let entry;
  try {
    entry = await resolveStream(videoId);
  } catch (err) {
    console.error("[stream] extract failed:", videoId, err.message);
    return NextResponse.json({ error: "stream unavailable", reason: err.message }, { status: 502 });
  }

  const rangeHeader = request.headers.get("range") || "bytes=0-";

  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await proxyRequest("GET", entry.url, rangeHeader);
      if (![200, 206].includes(upstream.statusCode)) {
        throw new Error(`upstream HTTP ${upstream.statusCode}`);
      }

      
      const headers = {
        "Content-Type": upstream.headers["content-type"] || entry.mime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      };
      if (upstream.headers["content-range"])
        headers["Content-Range"] = upstream.headers["content-range"];
      if (upstream.headers["content-length"] && !upstream.headers["content-encoding"])
        headers["Content-Length"] = upstream.headers["content-length"];

      const status = upstream.statusCode;

      
      const body = new ReadableStream({
        start(controller) {
          upstream.on("data", chunk => controller.enqueue(chunk));
          upstream.on("end", () => controller.close());
          upstream.on("error", err => controller.error(err));
        },
        cancel() { upstream.destroy(); },
      });

      return new Response(body, { status, headers });
    } catch (err) {
      console.warn(`[stream] upstream error attempt ${attempt + 1}:`, videoId, err.message);
      
      cache.delete(videoId);
      try {
        entry = await resolveStream(videoId);
      } catch (e2) {
        console.error("[stream] re-extract failed:", videoId, e2.message);
        break;
      }
    }
  }

  return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
}

export async function HEAD(request) {
  const { searchParams } = new URL(request.url);
  let videoId = searchParams.get("videoId") || "";
  if (videoId.includes("&")) videoId = videoId.split("&")[0];

  if (!isValidVideoId(videoId)) {
    return new Response(null, { status: 400 });
  }

  let entry;
  try {
    entry = await resolveStream(videoId);
  } catch {
    return new Response(null, { status: 502 });
  }

  const rangeHeader = request.headers.get("range") || "bytes=0-";
  try {
    const upstream = await proxyRequest("HEAD", entry.url, rangeHeader);
    const headers = {
      "Content-Type": upstream.headers["content-type"] || entry.mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    };
    if (upstream.headers["content-range"])
      headers["Content-Range"] = upstream.headers["content-range"];
    if (upstream.headers["content-length"] && !upstream.headers["content-encoding"])
      headers["Content-Length"] = upstream.headers["content-length"];
    return new Response(null, { status: upstream.statusCode, headers });
  } catch {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": entry.mime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }
}
