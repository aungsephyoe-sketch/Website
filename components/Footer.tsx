import Link from "next/link";
import {
  SITE_NAME,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  CONTACT_EMAIL,
  SERVICE_AREA,
} from "@/lib/site-config";
import { PhoneIcon, MailIcon, MapPinIcon } from "./icons";

export default function Footer() {
  return (
    <footer id="contact" className="mt-20 border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-1.5 text-xl font-extrabold text-white">
              <span className="rounded-lg bg-white/10 px-2 py-1">Shop</span>
              <span className="text-amber-500">usedcarz</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              Quality pre-owned cars, trucks, SUVs, and vans serving {SERVICE_AREA} and the surrounding area.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Links</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/" className="transition hover:text-amber-400">
                  Browse Inventory
                </Link>
              </li>
              <li>
                <a href="#contact" className="transition hover:text-amber-400">
                  Contact Us
                </a>
              </li>
              <li>
                <Link href="/admin/login" className="transition hover:text-amber-400">
                  Dealer Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Get In Touch</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-2 transition hover:text-amber-400">
                  <PhoneIcon className="h-4 w-4 flex-shrink-0" /> {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 transition hover:text-amber-400">
                  <MailIcon className="h-4 w-4 flex-shrink-0" /> {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <MapPinIcon className="h-4 w-4 flex-shrink-0" /> {SERVICE_AREA}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
