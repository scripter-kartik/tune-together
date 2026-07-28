import YTMusic from "ytmusic-api";
const ytmusic = new YTMusic();
await ytmusic.initialize();
const songs = await ytmusic.searchSongs("hello");
console.log(JSON.stringify(songs[0], null, 2));
