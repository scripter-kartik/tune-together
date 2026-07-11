import YTMusic from "ytmusic-api";

let ytmusicInstance = null;

export async function getYTMusic() {
  if (!ytmusicInstance) {
    ytmusicInstance = new YTMusic();
    await ytmusicInstance.initialize();
  }
  return ytmusicInstance;
}
