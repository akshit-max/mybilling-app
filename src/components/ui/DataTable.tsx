import React from "react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({ columns, data, keyExtractor, emptyState }: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          {columns.map((col, i) => (
            <div key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || 'flex-1'}`}>
              {col.header}
            </div>
          ))}
        </div>
        <div className="p-12">
          {emptyState || <div className="text-center text-gray-500">No data available</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-200">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 font-semibold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="group hover:bg-gray-50/50 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-3 text-gray-700 whitespace-nowrap ${col.className || ''}`}>
                    {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey]) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
