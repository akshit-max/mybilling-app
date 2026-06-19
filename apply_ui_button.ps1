# apply_ui_button.ps1
# Adds the Save to Inventory UI button after the CUSTOM div close tag in remaining pages.

$ErrorActionPreference = "Continue"

$files = @(
  'D:\Billing-app\billing-app\src\app\dashboard\quotations\create\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\quotations\edit\[id]\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\purchase-orders\create\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\purchase-orders\edit\[id]\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\credit-note\create\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\credit-note\edit\[id]\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\debit-note\create\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\debit-note\edit\[id]\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\delivery-challan\create\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\delivery-challan\edit\[id]\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\automated-bills\create\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\automated-bills\edit\[id]\page.tsx',
  'D:\Billing-app\billing-app\src\app\dashboard\proforma-invoice\edit\[id]\page.tsx'
)

foreach ($fp in $files) {
  if (-not (Test-Path -LiteralPath $fp)) {
    Write-Host "NOT FOUND: $fp"
    continue
  }

  $c = [System.IO.File]::ReadAllText($fp, [System.Text.UTF8Encoding]::new($false))

  if ($c.Contains('savedToInventoryRows[idx]')) {
    Write-Host "SKIP (already done): $fp"
    continue
  }

  $changed = $false

  # Pattern: the closing </div> of the CUSTOM flex row followed by ") : ("
  # We insert the save button between the </div> and the ") : ("
  # Using unique surrounding context to be precise
  $searchA = "                            <X size={14} />`r`n                            </button>`r`n                          </div>`r`n                        ) : ("
  $replaceA = "                            <X size={14} />`r`n                            </button>`r`n                          </div>`r`n                        {item.name.trim() && (`r`n                          savedToInventoryRows[idx] ? (`r`n                            <span className=""text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded w-fit"">Saved to Inventory</span>`r`n                          ) : (`r`n                            <button type=""button"" onClick={() => handleSaveToInventory(idx)} disabled={savingToInventoryRow[idx]} className=""text-[9px] text-indigo-600 font-bold hover:text-indigo-800 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors disabled:opacity-50 w-fit"">`r`n                              {savingToInventoryRow[idx] ? ""Saving..."" : ""Save to Inventory""}`r`n                            </button>`r`n                          )`r`n                        )}`r`n                        ) : ("

  if ($c.Contains($searchA)) {
    $c = $c.Replace($searchA, $replaceA)
    $changed = $true
    Write-Host "  + UI (style A)"
  }

  # Pattern B: compact modules (purchase-return style) - already handled, skip

  if ($changed) {
    [System.IO.File]::WriteAllText($fp, $c, [System.Text.UTF8Encoding]::new($false))
    Write-Host "DONE: $fp"
  } else {
    # Try a broader search for the pattern
    $idx1 = $c.IndexOf("<X size={14} />")
    if ($idx1 -gt 0) {
      Write-Host "Pattern not matched (X icon found at $idx1): $fp"
    } else {
      Write-Host "NO CUSTOM PATTERN: $fp"
    }
  }
}

Write-Host "`nAll files processed."
