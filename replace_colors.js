const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  // Primary (Navy/Slate)
  { regex: /bg-\[#4F5B9A\]/g, replacement: 'bg-brand-primary' },
  { regex: /text-\[#4F5B9A\]/g, replacement: 'text-brand-primary' },
  { regex: /border-\[#4F5B9A\]/g, replacement: 'border-brand-primary' },
  { regex: /fill-\[#4F5B9A\]/g, replacement: 'fill-brand-primary' },
  { regex: /ring-\[#4F5B9A\]/g, replacement: 'ring-brand-primary' },
  { regex: /from-\[#4F5B9A\]/g, replacement: 'from-brand-primary' },
  { regex: /to-\[#4F5B9A\]/g, replacement: 'to-brand-primary' },
  { regex: /bg-blue-600/g, replacement: 'bg-brand-primary' },
  { regex: /text-blue-600/g, replacement: 'text-brand-primary' },
  
  // Secondary (Orange)
  // Reusing existing tailwind orange but aligning to semantic token if needed.
  // We'll replace hardcoded #F97316 or orange-500
  { regex: /bg-orange-500/g, replacement: 'bg-brand-secondary' },
  { regex: /text-orange-500/g, replacement: 'text-brand-secondary' },

  // Tertiary (Green)
  { regex: /bg-emerald-500/g, replacement: 'bg-brand-tertiary' },
  { regex: /bg-green-500/g, replacement: 'bg-brand-tertiary' },
  { regex: /text-emerald-500/g, replacement: 'text-brand-tertiary' },
  { regex: /text-green-500/g, replacement: 'text-brand-tertiary' },
  { regex: /text-emerald-600/g, replacement: 'text-brand-tertiary' },
  { regex: /text-green-600/g, replacement: 'text-brand-tertiary' },

  // Neutral (Cream)
  { regex: /bg-\[#FFFBF2\]/g, replacement: 'bg-brand-neutral' },
  { regex: /bg-orange-50/g, replacement: 'bg-brand-neutral' },
  
  // Font classes mapping to standard sans
  { regex: /font-sans/g, replacement: 'font-sans' } // Handled globally by globals.css
];

function processDirectory(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    } 
    files.forEach(function (file) {
      const fullPath = path.join(directory, file);
      fs.stat(fullPath, (err, stat) => {
        if (stat.isDirectory()) {
          processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
          fs.readFile(fullPath, 'utf8', (err, data) => {
            if (err) return console.log(err);
            let result = data;
            let modified = false;
            replacements.forEach(({ regex, replacement }) => {
              if (regex.test(result)) {
                result = result.replace(regex, replacement);
                modified = true;
              }
            });
            
            if (modified) {
              fs.writeFile(fullPath, result, 'utf8', (err) => {
                if (err) return console.log(err);
                console.log(`Updated colors in: ${fullPath}`);
              });
            }
          });
        }
      });
    });
  });
}

processDirectory(directoryPath);
