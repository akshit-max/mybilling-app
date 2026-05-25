const fs = require('fs');

const files = [
  "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\settings\\reminders\\page.tsx",
  "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\settings\\print\\page.tsx",
  "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\settings\\page.tsx",
  "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\settings\\item\\page.tsx",
  "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\settings\\account\\page.tsx",
  "d:\\Billing-app\\billing-app\\src\\app\\dashboard\\e-invoicing\\page.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Add import if not exists
  if (!content.includes('import { useChat }')) {
    content = content.replace(
      'import React, {', 
      'import { useChat } from "@/context/ChatContext";\nimport React, {'
    );
    if (!content.includes('import { useChat }')) {
       content = content.replace(
          'import React from',
          'import { useChat } from "@/context/ChatContext";\nimport React from'
       );
    }
    // Fallback if the above doesn't work
    if (!content.includes('import { useChat }')) {
        content = 'import { useChat } from "@/context/ChatContext";\n' + content;
    }
  }

  // Inject hook
  if (!content.includes('const { openChat } = useChat();')) {
     content = content.replace(
        /export default function [a-zA-Z0-9_]+\(\) \{/,
        match => `${match}\n  const { openChat } = useChat();`
     );
  }

  // Replace button onClick
  if (file.includes('reminders')) {
    content = content.replace(
       /<button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">/g,
       `<button onClick={openChat} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">`
    );
  } else if (file.includes('print')) {
    content = content.replace(
       /<button className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors">/g,
       `<button onClick={openChat} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors">`
    );
  } else if (file.includes('settings\\page.tsx')) {
    content = content.replace(
       /<button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">/g,
       `<button onClick={openChat} className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">`
    );
  } else if (file.includes('item\\page.tsx')) {
    content = content.replace(
       /<button className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">/g,
       `<button onClick={openChat} className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">`
    );
  } else if (file.includes('account\\page.tsx')) {
    content = content.replace(
       /<button className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors">/g,
       `<button onClick={openChat} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors">`
    );
  } else if (file.includes('e-invoicing')) {
    content = content.replace(
       /<button className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:text-indigo-700 transition">/g,
       `<button onClick={openChat} className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:text-indigo-700 transition">`
    );
  }

  fs.writeFileSync(file, content, 'utf8');
}
