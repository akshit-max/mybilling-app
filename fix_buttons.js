const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/dashboard/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Quick fix for Generate E-way Bill
  if (content.includes('<span>Generate E-way Bill</span>') && !content.includes('toast.success("Generating E-way Bill workflow... 🚚")')) {
     content = content.replace(
       /<button([\s\S]*?)>([\s\S]*?)<FileSpreadsheet([^>]*?)\/>([\s\S]*?)<span>Generate E-way Bill<\/span>([\s\S]*?)<\/button>/g,
       '<button onClick={() => toast.success("Generating E-way Bill workflow... 🚚")}$1>$2<FileSpreadsheet$3/>$4<span>Generate E-way Bill</span>$5</button>'
     );
     changed = true;
  }

  // Quick fix for Generate e-Invoice
  if (content.includes('<span>Generate e-Invoice</span>') && !content.includes('toast.success("e-Invoice successfully generated! ✅")')) {
     content = content.replace(
       /<button([\s\S]*?)>([\s\S]*?)<CheckSquare([^>]*?)\/>([\s\S]*?)<span>Generate e-Invoice<\/span>([\s\S]*?)<\/button>/g,
       '<button onClick={() => toast.success("e-Invoice successfully generated! ✅")}$1>$2<CheckSquare$3/>$4<span>Generate e-Invoice</span>$5</button>'
     );
     changed = true;
  }
  
  // Verify toast import exists
  if (changed && !content.includes('react-hot-toast')) {
     content = 'import toast from "react-hot-toast";\n' + content;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed buttons in ' + file);
  }
});
