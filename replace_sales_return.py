import re
import os

path = r"d:\Billing-app\billing-app\src\app\dashboard\sales-return\create\page.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replacements
content = content.replace("CreateSalesInvoice", "CreateSalesReturn")
content = content.replace("Create Sales Invoice", "Create Sales Return")
content = content.replace("Invoice No:", "Sales Return No:")
content = content.replace("Invoice Date:", "Sales Return Date:")
content = content.replace('collection(db, "invoices")', 'collection(db, "salesReturns")')
content = content.replace('type="invoice"', 'type="sales-return"')
content = content.replace('invoiceType === "estimate" ? "Estimate" : "Sales Invoice"', '"Sales Return"')
content = content.replace('value={invoiceNumber}', 'value={salesReturnNumber}')
content = content.replace('setInvoiceNumber', 'setSalesReturnNumber')
content = content.replace('const [invoiceNumber', 'const [salesReturnNumber')
content = content.replace('value={invoiceDate}', 'value={salesReturnDate}')
content = content.replace('setInvoiceDate', 'setSalesReturnDate')
content = content.replace('const [invoiceDate', 'const [salesReturnDate')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
    
print("Replacements done.")
