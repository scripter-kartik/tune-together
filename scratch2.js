const { getYTMusic } = require("./src/lib/ytmusic.js");
(async () => {
  try {
    const ytm = await getYTMusic();
    const artists = await ytm.searchArtists("Eminem");
    const artist = await ytm.getArtist(artists[0].artistId);
    console.log(Object.keys(artist));
  } catch (e) {
    console.error(e);
  }
})();
