const { Innertube } = require('youtubei.js');
async function test() {
  const yt = await Innertube.create();
  const info = await yt.getInfo('jNQXAC9IVRw'); // using getInfo instead of getBasicInfo
  const format = info.chooseFormat({ type: 'audio', quality: 'best' });
  console.log(format ? format.url : "no format");
}
test().catch(console.error);
