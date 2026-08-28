"use client";

import Link from "next/link";
import { useState } from "react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "@/lib/site-config";
import { PhoneIcon, MailIcon, MenuIcon, CloseIcon } from "./icons";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur">
      <div className="bg-slate-900 text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-5 px-4 py-2 text-xs sm:px-6 sm:text-sm">
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-1.5 transition hover:text-amber-400">
            <PhoneIcon className="h-3.5 w-3.5" />
            <span>{CONTACT_PHONE_DISPLAY}</span>
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hidden items-center gap-1.5 transition hover:text-amber-400 sm:flex"
          >
            <MailIcon className="h-3.5 w-3.5" />
            <span>{CONTACT_EMAIL}</span>
          </a>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-slate-900">
            <span className="rounded-lg bg-slate-900 px-2 py-1 text-white">Shop</span>
            <span className="text-amber-500">usedcarz</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
            <Link href="/" className="transition hover:text-blue-700">
              Inventory
            </Link>
            <Link href="/#contact" className="transition hover:text-blue-700">
              Contact
            </Link>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="rounded-full bg-amber-500 px-5 py-2.5 text-white shadow-sm transition hover:bg-amber-600"
            >
              Call {CONTACT_PHONE_DISPLAY}
            </a>
          </nav>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-4 text-sm font-semibold text-slate-700">
              <Link href="/" onClick={() => setOpen(false)}>
                Inventory
              </Link>
              <Link href="/#contact" onClick={() => setOpen(false)}>
                Contact
              </Link>
              <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-2 text-blue-700">
                <PhoneIcon className="h-4 w-4" /> {CONTACT_PHONE_DISPLAY}
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-blue-700">
                <MailIcon className="h-4 w-4" /> {CONTACT_EMAIL}
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
