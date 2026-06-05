const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src/app/dashboard');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/gstRate: i\.gstRate \|\| 18/g, "gstRate: i.gstRate ?? 18");
  content = content.replace(/gstRate: found\.gst \|\| 18/g, "gstRate: found.gst ?? 18");
  content = content.replace(/\{item\.gstRate \|\| 18\}%/g, "{item.gstRate ?? 18}%");
  content = content.replace(/\(\(item\.gstRate \|\| 18\)/g, "((item.gstRate ?? 18)");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated: " + file);
  }
});
