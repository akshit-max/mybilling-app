"use client";

import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push("/");
    } else {
      alert("Still offline");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">

      <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">

        <h1 className="text-3xl font-bold text-purple-600 mb-4">
          You are Offline
        </h1>

        <p className="text-gray-600 mb-6">
          Internet connection is unavailable.
          You can still access cached data.
        </p>

        <button
          onClick={handleRetry}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
        >
          Retry
        </button>

      </div>
    </div>
  );
}