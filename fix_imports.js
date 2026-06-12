const fs = require('fs');
const files = [
  'd:/Billing-app/billing-app/src/app/dashboard/proforma-invoice/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/proforma-invoice/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/delivery-challan/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/delivery-challan/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/credit-note/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/credit-note/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/debit-note/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/debit-note/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-orders/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-orders/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/automated-bills/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/automated-bills/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/sales-return/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/sales-return/edit/[id]/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-return/create/page.tsx',
  'd:/Billing-app/billing-app/src/app/dashboard/purchase-return/edit/[id]/page.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // The regex we used for X was: /import \{([\s\S]*?)\} from "lucide-react";/
  // Which matched from the first import to lucide-react.
  // This means it corrupted the imports block:
  // import { X,  useRouter ... \n ... } from "lucide-react";
  
  // We need to restore the imports!
  
  if (content.includes('import { X,  useRouter, useParams } from "next/navigation";')) {
     content = content.replace('import { X,  useRouter, useParams } from "next/navigation";', 'import { useRouter, useParams } from "next/navigation";');
     changed = true;
  }
  
  if (content.includes('import { X,  useRouter } from "next/navigation";')) {
     content = content.replace('import { X,  useRouter } from "next/navigation";', 'import { useRouter } from "next/navigation";');
     changed = true;
  }

  // Also replace any other accidental X insertions
  // Just use a simpler regex to safely inject X into lucide-react
  if (changed || content.includes('<X size={14} />')) {
      if (!content.includes('import { X,') && !content.includes(', X } from "lucide-react"')) {
         content = content.replace(/import \{([^}]+)\} from "lucide-react";/, 'import { X, $1} from "lucide-react";');
         changed = true;
      }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed imports for', file);
  }
}
