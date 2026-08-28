import { NextRequest, NextResponse } from "next/server";
import { getVehicleById } from "@/lib/vehicles";
import { addInquiry } from "@/lib/inquiries";
import { sendInquirySms } from "@/lib/twilio";
import { vehicleTitle } from "@/lib/format";

interface InquiryBody {
  vehicleId?: string;
  name?: string;
  phone?: string;
  message?: string;
  /** Honeypot field — real visitors never fill this in. */
  company?: string;
}

export async function POST(request: NextRequest) {
  let body: InquiryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Bots tend to fill every field, including hidden ones — silently accept and drop.
  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name || "").trim();
  const phone = (body.phone || "").trim();
  const message = (body.message || "").trim();
  const vehicleId = (body.vehicleId || "").trim();

  if (!name || name.length > 200) {
    return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return NextResponse.json({ ok: false, error: "Please enter a valid phone number." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ ok: false, error: "Message is too long." }, { status: 400 });
  }

  const vehicle = vehicleId ? await getVehicleById(vehicleId) : null;
  if (!vehicle) {
    return NextResponse.json({ ok: false, error: "Vehicle not found." }, { status: 404 });
  }

  const label = vehicleTitle(vehicle);
  const sms = await sendInquirySms({ name, phone, message, vehicleLabel: label });

  // The lead is saved regardless of SMS outcome so nothing is ever lost to a
  // misconfigured or momentarily-down Twilio account.
  await addInquiry({
    vehicleId: vehicle.id,
    vehicleLabel: label,
    name,
    phone,
    message,
    smsStatus: sms.status,
    smsError: sms.status === "failed" ? sms.error : undefined,
  });

  return NextResponse.json({ ok: true });
}
