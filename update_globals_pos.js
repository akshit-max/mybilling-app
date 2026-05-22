const fs = require('fs');

const path = 'src/app/globals.css';
let content = fs.readFileSync(path, 'utf8');

const searchThermal = `#thermal-print {
    position: absolute;
    left: 0;
    top: 10px;
    width: 80mm;
    padding: 10px;
    background: white;
  }`;

const replaceThermal = `#thermal-print, #pos-receipt {
    position: absolute;
    left: 0;
    top: 10px;
    width: 80mm;
    padding: 10px;
    background: white;
  }`;

const searchThermalHide = `#thermal-print,
  #thermal-print * {
    visibility: visible;
  }`;

const replaceThermalHide = `#thermal-print,
  #thermal-print *,
  #pos-receipt,
  #pos-receipt * {
    visibility: visible;
  }`;

content = content.replace(searchThermal, replaceThermal);
content = content.replace(searchThermalHide, replaceThermalHide);

fs.writeFileSync(path, content);
console.log("Updated globals.css to support #pos-receipt thermal printing.");
