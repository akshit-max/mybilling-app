const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/*.{tsx,ts}', { nodir: true });

let modified = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('hsnCode: data.hsnCode || "",')) {
    if (!content.includes('costPrice: Number(data.costPrice || 0),')) {
      content = content.replace(
        /hsnCode:\s*data\.hsnCode\s*\|\|\s*"",/g,
        'hsnCode: data.hsnCode || "",\n              costPrice: Number(data.costPrice || 0),'
      );
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
      modified++;
    }
  }
}

console.log(`Modified ${modified} files.`);
