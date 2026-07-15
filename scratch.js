const { getYTMusic } = require("./src/lib/ytmusic.js");
(async () => {
  try {
    const ytm = await getYTMusic();
    const artists = await ytm.searchArtists("Eminem");
    const artistId = artists[0].artistId;
    const artist = await ytm.getArtist(artistId);
    console.log(JSON.stringify(artist, null, 2).substring(0, 3000));
  } catch (e) {
    console.error(e);
  }
})();
