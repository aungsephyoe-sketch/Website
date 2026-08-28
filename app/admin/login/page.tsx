import { redirect } from "next/navigation";
import { isAdminRequest, isAdminPasswordConfigured } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  if (await isAdminRequest()) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Dealer Login</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage your listings.</p>
        {!isAdminPasswordConfigured() && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">
            ADMIN_PASSWORD is not set yet. Add it to your environment variables to enable login — see .env.example.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
