# apply_save_to_inventory.ps1
# Applies the "Save to Inventory" additive feature to remaining transaction pages.
# Safe: only adds new state/handler/UI, never modifies existing logic.

$ErrorActionPreference = "Stop"

$stateSnippet = @"
  // Save-to-inventory state (additive — no effect on existing flows)
  const [savedToInventoryRows, setSavedToInventoryRows] = useState<Record<number, boolean>>({});
  const [savingToInventoryRow, setSavingToInventoryRow] = useState<Record<number, boolean>>({});
"@

$handlerSnippet = @"
  // Save a CUSTOM item row to inventory — additive only, never alters the transaction
  const handleSaveToInventory = async (idx: number) => {
    const user = auth.currentUser;
    if (!user) return toast.error("Not logged in");
    const item = items[idx];
    const trimmedName = (item.name || "").trim();
    if (!trimmedName) return toast.error("Enter an item name first");
    setSavingToInventoryRow((prev) => ({ ...prev, [idx]: true }));
    try {
      let isOfflineMode = !navigator.onLine;
      if (!isOfflineMode) {
        try {
          const t = await fetch("/favicon.ico?cache=" + Date.now(), { method: "HEAD", cache: "no-store" });
          if (!t.ok) isOfflineMode = true;
        } catch { isOfflineMode = true; }
      }
      if (isOfflineMode) {
        const { saveCustomItemToInventoryOffline } = await import("@/lib/saveToInventory");
        const result = await saveCustomItemToInventoryOffline(
          { name: item.name, price: item.price, gstRate: item.gstRate, hsn: (item as any).hsn, description: item.description },
          user.uid, products, user.displayName || "Admin"
        );
        if (!result.success) return toast.error((result as any).error);
        toast.success(`'${trimmedName}' queued for inventory. Syncs when online. 🔄`);
      } else {
        const { saveCustomItemToInventory } = await import("@/lib/saveToInventory");
        const result = await saveCustomItemToInventory(
          { name: item.name, price: item.price, gstRate: item.gstRate, hsn: (item as any).hsn, description: item.description },
          user.uid, products, user.displayName || "Admin"
        );
        if (!result.success) return toast.error((result as any).error);
        const newProduct = { id: (result as any).productId, name: trimmedName, price: Number(item.price) || 0, gst: Number(item.gstRate ?? 18), stock: 0, unit: "PCS", hsnCode: (item as any).hsn || "", barcode: "" };
        setProducts((prev) => [...prev, newProduct]);
        try {
          const { getCachedProducts, cacheProducts } = await import("@/lib/indexedDB");
          const cached = await getCachedProducts(user.uid);
          await cacheProducts([...cached, { ...newProduct, userId: user.uid }]);
        } catch { /* non-critical */ }
        toast.success(`'${trimmedName}' saved to inventory! ✅`);
      }
      setSavedToInventoryRows((prev) => ({ ...prev, [idx]: true }));
    } catch (err) {
      console.error("Save to inventory failed:", err);
      toast.error("Failed to save item to inventory");
    } finally {
      setSavingToInventoryRow((prev) => ({ ...prev, [idx]: false }));
    }
  };

"@

# Old CUSTOM div pattern (compact, no nested div)
$oldCustomDiv = @'
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          placeholder="Enter custom service/item name..."
                          className="w-full border border-indigo-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-indigo-50/20 font-medium text-gray-800"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const updated = [...items];
                            updated[idx] = { ...updated[idx], productId: "", name: "", price: 0, gstRate: 18, hsn: "", description: "" };
                            setItems(updated);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Cancel custom item"
                        >
                          <X size={14} />
                        </button>
                      </div>
'@

$newCustomDiv = @'
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            placeholder="Enter custom service/item name..."
                            className="w-full border border-indigo-300 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-indigo-50/20 font-medium text-gray-800"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              const updated = [...items];
                              updated[idx] = { ...updated[idx], productId: "", name: "", price: 0, gstRate: 18, hsn: "", description: "" };
                              setItems(updated);
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Cancel custom item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {item.name.trim() && (
                          savedToInventoryRows[idx] ? (
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded w-fit">✓ Saved to Inventory</span>
                          ) : (
                            <button type="button" onClick={() => handleSaveToInventory(idx)} disabled={savingToInventoryRow[idx]} className="text-[9px] text-indigo-600 font-bold hover:text-indigo-800 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors disabled:opacity-50 w-fit" title="Save this item to your product inventory">
                              {savingToInventoryRow[idx] ? "Saving..." : "💾 Save to Inventory"}
                            </button>
                          )
                        )}
                      </div>
'@

# Anchor: gstEnabled state (add state vars after this line)
$stateAnchor = "  const [gstEnabled, setGstEnabled] = useState(true);"

# Files to process (create pages use handleSave, edit pages use handleUpdate)
$files = @(
    @{ path = "src\app\dashboard\quotations\create\page.tsx"; anchor = "  const handleSave = async () => {" },
    @{ path = "src\app\dashboard\quotations\edit\[id]\page.tsx"; anchor = "  const handleUpdate = async () => {" },
    @{ path = "src\app\dashboard\proforma-invoice\edit\[id]\page.tsx"; anchor = "  const handleUpdate = async () => {" },
    @{ path = "src\app\dashboard\purchase-orders\create\page.tsx"; anchor = "  const handleSave = async () => {" },
    @{ path = "src\app\dashboard\purchase-orders\edit\[id]\page.tsx"; anchor = "  const handleUpdate = async () => {" },
    @{ path = "src\app\dashboard\credit-note\create\page.tsx"; anchor = "  const handleSave = async () => {" },
    @{ path = "src\app\dashboard\credit-note\edit\[id]\page.tsx"; anchor = "  const handleUpdate = async () => {" },
    @{ path = "src\app\dashboard\debit-note\create\page.tsx"; anchor = "  const handleSave = async () => {" },
    @{ path = "src\app\dashboard\debit-note\edit\[id]\page.tsx"; anchor = "  const handleUpdate = async () => {" },
    @{ path = "src\app\dashboard\delivery-challan\create\page.tsx"; anchor = "  const handleSave = async () => {" },
    @{ path = "src\app\dashboard\delivery-challan\edit\[id]\page.tsx"; anchor = "  const handleUpdate = async () => {" },
    @{ path = "src\app\dashboard\automated-bills\create\page.tsx"; anchor = "  const handleSave = async () => {" },
    @{ path = "src\app\dashboard\automated-bills\edit\[id]\page.tsx"; anchor = "  const handleSave = async () => {" }
)

$base = "d:\Billing-app\billing-app"

foreach ($f in $files) {
    $fullPath = Join-Path $base $f.path
    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP (not found): $($f.path)"
        continue
    }

    $content = Get-Content $fullPath -Raw -Encoding UTF8

    # Skip if already patched
    if ($content -contains "handleSaveToInventory" -or $content.Contains("handleSaveToInventory")) {
        Write-Host "SKIP (already patched): $($f.path)"
        continue
    }

    $modified = $false

    # 1. Add state vars after gstEnabled line (only if not already there)
    if ($content.Contains($stateAnchor) -and -not $content.Contains("savedToInventoryRows")) {
        $content = $content.Replace($stateAnchor, "$stateAnchor`r`n$stateSnippet")
        $modified = $true
        Write-Host "  + State vars added"
    }

    # 2. Add handler before save/update function
    if ($content.Contains($f.anchor)) {
        $content = $content.Replace($f.anchor, "$handlerSnippet$($f.anchor)")
        $modified = $true
        Write-Host "  + Handler added"
    }

    # 3. Replace CUSTOM div with enhanced version
    if ($content.Contains($oldCustomDiv)) {
        $content = $content.Replace($oldCustomDiv, $newCustomDiv)
        $modified = $true
        Write-Host "  + UI button added"
    }

    if ($modified) {
        # Write with UTF8 (no BOM to preserve file format)
        [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "DONE: $($f.path)"
    } else {
        Write-Host "NO CHANGE: $($f.path) (pattern not matched)"
    }
}

Write-Host "`nAll files processed."
