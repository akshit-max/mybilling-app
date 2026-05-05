// components/FullScreenLoader.tsx
import Loader from "./Loader";

export default function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center 
    bg-gradient-to-br from-[#0B1120] via-[#1E1B4B] to-[#4C1D95]">
      <Loader size={50} />
    </div>
  );
}