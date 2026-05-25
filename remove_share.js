const fs = require('fs');

const files = ['src/app/dashboard/payment-in/[id]/page.tsx', 'src/app/dashboard/payment-out/[id]/page.tsx'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  
  // Find the Share dropdown div and remove it. It starts with <div className="relative"> and ends with </div> after the {isShareOpen && (...)} block.
  // Easiest is to replace the whole block if it exists.
  
  const regex = /<div className="relative">\s*<button[\s\S]*?onClick=\{\(\) => setIsShareOpen\(!isShareOpen\)\}[\s\S]*?<\/div>\s*<\/div>/g;
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(f, content);
    console.log('Removed share from', f);
  }
});
