const fs = require('fs');
const path = require('path');
const strip = require('strip-comments');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git') && !file.includes('scratch')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
        results.push(file);
      }
    }
  });
  return results;
}

const root = path.join(__dirname, '..');
const files = walk(path.join(root, 'src'));

let count = 0;
for (const file of files) {
  if (fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf8');
    try {
      const stripped = strip(code);
      if (code !== stripped) {
        fs.writeFileSync(file, stripped, 'utf8');
        count++;
      }
    } catch (e) {
      console.error('Error stripping ' + file + ': ' + e.message);
    }
  }
}
console.log('Stripped comments from ' + count + ' additional files.');
