"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A14]">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#E8E8F0] mb-4">Oops!</h1>
        <p className="text-xl text-[#7E7E98] mb-4">Something went wrong</p>
        <p className="text-sm text-[#4A4A64] mb-8">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#00FFE0] text-[#0A0A14] rounded-lg font-medium hover:bg-[#00E676] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
