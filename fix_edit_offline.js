const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'purchases', 'edit', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The block starts from: // Connectivity / Offline detection
// And ends right before: // --- ONLINE UPDATE WORKSPACE ---
const offlineCheckRegex = /\/\/ Connectivity \/ Offline detection[\s\S]*?\/\/ --- ONLINE UPDATE WORKSPACE ---/m;

content = content.replace(offlineCheckRegex, '// --- ONLINE UPDATE WORKSPACE ---');

fs.writeFileSync(filePath, content);
console.log("Removed aggressive offline check from edit page.");
