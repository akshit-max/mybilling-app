const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/invoices/create/page.tsx', 'utf8');

// 1. Import useSearchParams
c = c.replace(/import \{ useRouter \} from "next\/navigation";/, 'import { useRouter, useSearchParams } from "next/navigation";');

// 2. Add useSearchParams call
c = c.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const searchParams = useSearchParams();\n  const fromQuoteId = searchParams?.get("fromQuote");');

// 3. Inject logic inside the fetchData useEffect
const quoteFetchLogic = `
        // If fromQuoteId is present, fetch that quotation to prefill invoice
        if (fromQuoteId) {
          try {
            const snap = await getDoc(doc(db, "invoices", fromQuoteId));
            if (snap.exists()) {
              const qData = snap.data();
              if (qData.customerName) setCustomerName(qData.customerName);
              if (qData.items && qData.items.length) {
                // Ensure gstRate fallback is there
                const mappedItems = qData.items.map((i) => ({...i, gstRate: i.gstRate || 18}));
                setItems(mappedItems);
              }
              if (qData.shippingAddress) setShippingAddress(qData.shippingAddress);
              if (qData.notes) {
                 setNotes(qData.notes);
                 setShowNotes(true);
              }
              if (qData.discountType) setDiscountType(qData.discountType);
              if (qData.discountValue) setDiscountValue(qData.discountValue);
              if (qData.additionalChargeName) setAdditionalChargeName(qData.additionalChargeName);
              if (qData.additionalChargeValue) setAdditionalChargeValue(qData.additionalChargeValue);
              toast.success("Converted Quotation data loaded! Review and Save as Invoice.");
            }
          } catch (e) {
            console.error("Failed to load quote", e);
          }
        }
`;

c = c.replace(
  /const fetchData = async \(\) => \{\s*const user = auth\.currentUser;\s*if \(!user\) return;\s*try \{/m,
  `const fetchData = async () => {\n      const user = auth.currentUser;\n      if (!user) return;\n\n      try {\n${quoteFetchLogic}`
);

// We need to wrap it in Suspense because useSearchParams triggers a client boundary warning if not suspended? No, the component is "use client" but Next.js will show a build error if useSearchParams is used without Suspense in a static page. Wait, dashboard is dynamically rendered if auth is there, but to be safe I can export default function CreateSalesInvoice() wrapped in a Suspense, or I can just let it be since it's a client component. Wait, standard Next.js 13+ practice: `useSearchParams` MUST be inside a `<Suspense>` boundary in `app/` dir, OR the page must opt into dynamic rendering. This page has no `export const dynamic = "force-dynamic"`.
// Instead of `useSearchParams`, let's just parse `window.location.search` manually inside `useEffect`. That completely circumvents Next.js static build warnings.

let c_safe = fs.readFileSync('src/app/dashboard/invoices/create/page.tsx', 'utf8');

const quoteFetchLogicSafe = `
        // Check URL for fromQuote
        const params = new URLSearchParams(window.location.search);
        const fromQuoteId = params.get("fromQuote");
        if (fromQuoteId) {
          try {
            const snap = await getDoc(doc(db, "invoices", fromQuoteId));
            if (snap.exists()) {
              const qData = snap.data();
              if (qData.customerName) setCustomerName(qData.customerName);
              if (qData.items && qData.items.length) {
                // Ensure gstRate fallback is there
                const mappedItems = qData.items.map((i) => ({...i, gstRate: i.gstRate || 18}));
                setItems(mappedItems);
              }
              if (qData.shippingAddress) setShippingAddress(qData.shippingAddress);
              if (qData.notes) {
                 setNotes(qData.notes);
                 setShowNotes(true);
              }
              if (qData.discountType) setDiscountType(qData.discountType);
              if (qData.discountValue) {
                setDiscountValue(qData.discountValue);
                setShowDiscountInput(true);
              }
              if (qData.additionalChargeName) setAdditionalChargeName(qData.additionalChargeName);
              if (qData.additionalChargeValue) setAdditionalChargeValue(qData.additionalChargeValue);
              toast.success("Converted Quotation data loaded! Review and Save as Invoice.");
            }
          } catch (e) {
            console.error("Failed to load quote", e);
          }
        }
`;

c_safe = c_safe.replace(
  /const fetchData = async \(\) => \{\s*const user = auth\.currentUser;\s*if \(!user\) return;\s*try \{/m,
  `const fetchData = async () => {\n      const user = auth.currentUser;\n      if (!user) return;\n\n      try {\n${quoteFetchLogicSafe}`
);

fs.writeFileSync('src/app/dashboard/invoices/create/page.tsx', c_safe);
console.log("Updated invoice create with URL param parsing");
