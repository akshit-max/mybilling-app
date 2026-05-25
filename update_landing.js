const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replaceLinks = ['"/features"', '"/solutions"', '"/pricing"', '"/knowledge"'];

  replaceLinks.forEach(link => {
    if (content.includes('href=' + link)) {
      content = content.split('href=' + link).join('href="/login"');
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed links in ' + file);
  }
});
