const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/reports/**/page.tsx');
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  const pattern = /body:\s*JSON\.stringify\(\{\s*to:\s*(emails|emailsList),\s*subject:\s*([^,]+),\s*html:\s*tableHTML\s*\}\)/g;
  
  content = content.replace(pattern, (match, toVar, subjectGroup) => {
    return `body: JSON.stringify({
          to: ${toVar},
          subject: ${subjectGroup},
          html: "<p>Please find the attached " + ${subjectGroup} + " Excel report.</p>",
          attachments: [
            {
              filename: ${subjectGroup}.replace(/\\s+/g, '_') + ".xls",
              content: btoa(unescape(encodeURIComponent(tableHTML)))
            }
          ]
        })`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed attachments in:', file);
  }
}
console.log('Total fixed:', count);
