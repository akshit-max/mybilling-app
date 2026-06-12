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
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app/dashboard');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  content = content.replace(/{item\.qty}\s*PCS/g, '{item.qty} {item.unit || "PCS"}');
  content = content.replace(/{rpt\.salesQty}\s*PCS/g, '{rpt.salesQty} {product.unit || "PCS"}');
  content = content.replace(/{totalQty}\s*PCS/g, '{totalQty}');

  if (original !== content) {
    fs.writeFileSync(f, content);
    console.log('Fixed ' + f);
  }
});
