const fs = require('fs');

const path = 'src/app/dashboard/cash-bank/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const printSearch = `<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center border-b border-gray-100">`;

const printReplace = `<div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" id="print-area">
            <div className="p-8 text-center border-b border-gray-100">`;

content = content.replace(printSearch, printReplace);

fs.writeFileSync(path, content);
console.log("Added id='print-area' to Cash & Bank print modal.");
