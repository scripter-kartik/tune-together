import YTMusic from "ytmusic-api";

async function main() {
  const ytmusic = new YTMusic();
  await ytmusic.initialize();
  const searchResults = await ytmusic.search("taylor swift");
  if (searchResults.length > 0) {
      console.log(JSON.stringify(searchResults[0].thumbnails, null, 2));
  } else {
      console.log("No results");
  }
}

main().catch(console.error);
