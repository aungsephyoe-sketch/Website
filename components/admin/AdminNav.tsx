import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminNav() {
  return (
    <div className="border-b border-slate-800 bg-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/admin" className="text-lg font-extrabold">
            Shopusedcarz <span className="text-amber-500">Admin</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-300">
            <Link href="/admin" className="transition hover:text-white">
              Listings
            </Link>
            <Link href="/admin/new" className="transition hover:text-white">
              Add Vehicle
            </Link>
            <Link href="/admin/leads" className="transition hover:text-white">
              Leads
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition hover:text-white">
            View Site
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
