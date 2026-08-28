import twilio from "twilio";
import type { SmsStatus } from "./types";

export interface SendInquirySmsParams {
  name: string;
  phone: string;
  message: string;
  vehicleLabel: string;
}

export type SmsResult = { status: SmsStatus; error?: string };

/**
 * Texts the dealer whenever a customer submits an inquiry.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, and
 * OWNER_PHONE_NUMBER to be set — see .env.example. If they're not configured yet,
 * this quietly no-ops so the inquiry is still captured instead of erroring out
 * on the customer.
 */
export async function sendInquirySms(params: SendInquirySmsParams): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const ownerNumber = process.env.OWNER_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !ownerNumber) {
    return { status: "not_configured" };
  }

  try {
    const client = twilio(accountSid, authToken);
    const body =
      `Shopusedcarz lead: ${params.name} (${params.phone}) asked about the ${params.vehicleLabel}. ` +
      `Message: ${params.message || "(no message)"}`;
    await client.messages.create({
      to: ownerNumber,
      from: fromNumber,
      body: body.slice(0, 1580),
    });
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown Twilio error" };
  }
}
