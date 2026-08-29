const ytdl = require('@distube/ytdl-core');
async function test() {
  const info = await ytdl.getInfo('jNQXAC9IVRw');
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
  console.log(format.url);
}
test().catch(console.error);
