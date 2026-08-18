import { Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";
import { TabHeader } from "@/components/marketplace/tab-header";

/**
 * Clean placeholder — no fake auth, no login form. Real account/auth
 * belongs to a later backend phase (Supabase).
 */
export default function AccountPage() {
  return (
    <>
      <TabHeader title={t.account.heading} />
      <div className="flex flex-col items-center gap-4 px-8 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
          <Sparkles size={26} className="text-fucsia-dark" />
        </div>
        <p className="font-display text-lg font-semibold text-charcoal">
          {t.account.comingSoonTitle}
        </p>
        <p className="text-sm text-charcoal-faint">{t.account.comingSoonSubtitle}</p>
      </div>
    </>
  );
}
