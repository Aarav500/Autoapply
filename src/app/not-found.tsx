import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A14]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#E8E8F0] mb-4">404</h1>
        <p className="text-xl text-[#7E7E98] mb-8">Page not found</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#00FFE0] text-[#0A0A14] rounded-lg font-medium hover:bg-[#00E676] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
