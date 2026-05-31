// components/Loader.tsx
export default function Loader({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <svg 
        className="animate-spin text-indigo-600" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>
  );
}