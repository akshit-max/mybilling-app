import os
import re

files = [
    r'src/app/dashboard/settings/reminders/page.tsx',
    r'src/app/dashboard/settings/print/page.tsx',
    r'src/app/dashboard/settings/page.tsx',
    r'src/app/dashboard/settings/item/page.tsx',
    r'src/app/dashboard/settings/account/page.tsx',
    r'src/app/dashboard/staff/[id]/page.tsx',
    r'src/app/dashboard/expenses/page.tsx'
]

for fpath in files:
    if not os.path.exists(fpath): continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'useChat' in content: continue
    
    content = re.sub(r'(import .* from "lucide-react";)', r'\1\nimport { useChat } from "@/context/ChatContext";', content)
    
    content = re.sub(r'(export default function[^{]+{\n)(.*?\n)', r'\1  const { openChat } = useChat();\n\2', content, count=1)
    
    content = re.sub(
        r'(<button className="flex items-center gap-1\.5 text-\[11px\] text-blue-600[^>]*>)(\s*<MessageCircle)',
        r'<button onClick={openChat} className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 px-4 py-1.5 rounded hover:bg-blue-100 font-bold uppercase tracking-wider transition-colors">\n\2',
        content
    )
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated', fpath)
