import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-3xl font-extrabold text-slate-900">Page Not Found</h1>
      <p className="mt-3 text-slate-500">This listing may have been sold or removed.</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
      >
        Browse Inventory
      </Link>
    </div>
  );
}
