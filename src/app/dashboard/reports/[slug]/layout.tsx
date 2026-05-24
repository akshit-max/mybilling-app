export function generateStaticParams() {
  return [
    { slug: "rate-list" },
    { slug: "stock-summary" },
    { slug: "low-stock-summary" },
    { slug: "item-sales-summary" },
    { slug: "sales-summary" },
    { slug: "gstr-1" },
    { slug: "gstr-2" },
    { slug: "daybook" },
    { slug: "daybook-purchase" },
    { slug: "bill-wise-profit" },
    { slug: "gstr-3b" },
    { slug: "gst-purchase-with-hsn" },
    { slug: "gst-sales-with-hsn" },
    { slug: "hsn-wise-sales-summary" },
    { slug: "tds-payable" },
    { slug: "tds-receivable" },
    { slug: "tcs-payable" },
    { slug: "tcs-receivable" },
    { slug: "audit-trail" },
    { slug: "cash-and-bank-report-all-payments" },
    { slug: "expense-category-report" },
    { slug: "expense-transaction-report" },
    { slug: "purchase-summary" },
    { slug: "item-sales-and-purchase-summary" },
    { slug: "stock-detail-report" },
    { slug: "party-report-by-item" },
    { slug: "party-statement-ledger" },
    { slug: "sales-summary-category-wise" },
    { slug: "profit-and-loss-report" },
    { slug: "balance-sheet" }
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
