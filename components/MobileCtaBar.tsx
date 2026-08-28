import { CONTACT_PHONE_TEL } from "@/lib/site-config";
import { PhoneIcon, MessageCircleIcon } from "./icons";

export default function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
      <a
        href={`tel:${CONTACT_PHONE_TEL}`}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
      >
        <PhoneIcon className="h-4 w-4" /> Call
      </a>
      <a
        href={`sms:${CONTACT_PHONE_TEL}`}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white"
      >
        <MessageCircleIcon className="h-4 w-4" /> Text Us
      </a>
    </div>
  );
}
