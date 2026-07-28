import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src/app');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Basic replacement: find `<img ` and replace it, but only if it doesn't already have referrerPolicy
  const regex = /<img(?![^>]*referrerPolicy)/g;
  if (regex.test(content)) {
    content = content.replace(regex, '<img referrerPolicy="no-referrer"');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
