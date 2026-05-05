// components/Loader.tsx
export default function Loader({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <div
        style={{ width: size, height: size }}
        className="border-4 border-white/20 border-t-purple-500 rounded-full animate-spin"
      />
    </div>
  );
}