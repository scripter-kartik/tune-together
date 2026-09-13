const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git') && !file.includes('.venv')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.py')) {
        results.push(file);
      }
    }
  });
  return results;
}

const root = path.join(__dirname, '..');
const files = walk(path.join(root, 'api'));

let count = 0;
for (const file of files) {
  if (fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf8');
    const stripped = code.replace(/^ *#.*$/gm, '').replace(/ +#[^'"\n]*$/gm, '');
    if (code !== stripped) {
      fs.writeFileSync(file, stripped, 'utf8');
      count++;
    }
  }
}
console.log('Stripped Python comments from ' + count + ' files.');
