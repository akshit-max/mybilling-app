const fs = require('fs');

const file = 'src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const searchStr = `          <button
            onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
            className={\`w-full bg-white text-[#141725] flex items-center \${collapsed ? "justify-center" : "justify-between"} px-4 py-2.5 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm shadow-sm\`}
            title="Create Sales Invoice"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-indigo-600 font-bold shrink-0" />
              {!collapsed && <span>Create Sales Invoice</span>}
            </div>
            {!collapsed && <ChevronDown size={15} className={\`text-gray-500 transition-transform duration-200 \${isCreateDropdownOpen ? "rotate-180" : ""}\`} />}
          </button>

          {isCreateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-3xs" onClick={() => setIsCreateDropdownOpen(false)}></div>
              <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150">
                <Link href="/dashboard/invoices/create" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 font-bold border-b border-gray-100 transition-colors">
                  <FileText size={16} className="text-indigo-600" />
                  <span>Sales Invoice</span>
                </Link>
                <Link href="/dashboard/quotations/create" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium border-b border-gray-100 transition-colors">
                  <FileCheck2 size={16} className="text-emerald-600" />
                  <span>Quotation / Estimate</span>
                </Link>
                <Link href="/dashboard/payment-in/create" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium border-b border-gray-100 transition-colors">
                  <Landmark size={16} className="text-blue-600" />
                  <span>Payment In</span>
                </Link>
                <Link href="/dashboard/purchases/create" onClick={() => setIsCreateDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 font-medium transition-colors">
                  <ShoppingBag size={16} className="text-purple-600" />
                  <span>Purchase Invoice</span>
                </Link>
              </div>
            </>
          )}`;

const replaceStr = `          <button
            onClick={() => router.push('/dashboard/invoices/create')}
            className={\`w-full bg-white text-[#141725] flex items-center \${collapsed ? "justify-center" : "justify-center gap-2"} px-4 py-2.5 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm shadow-sm\`}
            title="Create Sales Invoice"
          >
              <Plus size={16} className="text-indigo-600 font-bold shrink-0" />
              {!collapsed && <span>Create Sales Invoice</span>}
          </button>`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Replaced Sidebar dropdown with single button.");
} else {
  console.log("Search string not found. Please check manually.");
}
