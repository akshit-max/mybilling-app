"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function RedirectEditPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  useEffect(() => {
    // Redirect cleanly to the parent products page with a query parameter triggering the SaaS popup overlay
    router.replace(`/dashboard/products?action=edit&id=${id}`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-12 text-gray-400 gap-2">
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      <span className="text-xs font-semibold">Redirecting to items workspace...</span>
    </div>
  );
}