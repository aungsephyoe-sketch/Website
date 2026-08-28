"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "@/lib/site-config";
import { CheckCircleIcon, PhoneIcon, MailIcon } from "./icons";

type Status = "idle" | "loading" | "success" | "error";

export default function InquiryForm({
  vehicleId,
  vehicleTitle,
}: {
  vehicleId: string;
  vehicleTitle: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    `I'm interested in the ${vehicleTitle}. Please contact me with more information.`
  );
  const [company, setCompany] = useState(""); // honeypot — real visitors never fill this in
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, name, phone, message, company }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please call us instead.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Something went wrong. Please call us instead.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="mt-3 text-lg font-bold text-emerald-900">Thanks{name ? `, ${name.split(" ")[0]}` : ""}!</h3>
        <p className="mt-1 text-sm text-emerald-800">
          We got your message about the {vehicleTitle} and will reach out shortly. Need us sooner? Call{" "}
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-semibold underline">
            {CONTACT_PHONE_DISPLAY}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">Interested in this vehicle?</h3>
      <p className="mt-1 text-sm text-slate-500">Send us your info and we&apos;ll text or call you back.</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label>
            Company
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="(469) 555-0123"
          />
        </div>
        <div>
          <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
            Message
          </label>
          <textarea
            id="message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {status === "error" && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send Inquiry"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm">
        <a
          href={`tel:${CONTACT_PHONE_TEL}`}
          className="flex items-center gap-2 font-semibold text-blue-700 transition hover:text-blue-900"
        >
          <PhoneIcon className="h-4 w-4" /> Call or text {CONTACT_PHONE_DISPLAY}
        </a>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-center gap-2 font-semibold text-blue-700 transition hover:text-blue-900"
        >
          <MailIcon className="h-4 w-4" /> {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}
