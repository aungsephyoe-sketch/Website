"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

export default function HeroSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    const qs = params.toString();
    router.push(`/${qs ? `?${qs}` : ""}#inventory`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-xl"
    >
      <SearchIcon className="ml-3 h-5 w-5 flex-shrink-0 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search make, model, or keyword…"
        aria-label="Search inventory"
        className="w-full flex-1 border-none bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
      <button
        type="submit"
        className="flex-shrink-0 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
      >
        Search
      </button>
    </form>
  );
}
