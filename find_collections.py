import os, re

src = r'd:\Billing-app\billing-app\src'
collections = set()

p1 = re.compile(r'collection\(db,\s*["\'](\w+)["\']')
p2 = re.compile(r'doc\(db,\s*["\'](\w+)["\']')
p3 = re.compile(r'adminDb\.collection\(["\'](\w+)["\']')

for root, dirs, files in os.walk(src):
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            try:
                with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as fh:
                    content = fh.read()
                    for m in p1.finditer(content): collections.add(m.group(1))
                    for m in p2.finditer(content): collections.add(m.group(1))
                    for m in p3.finditer(content): collections.add(m.group(1))
            except: pass

for c in sorted(collections):
    print(c)
