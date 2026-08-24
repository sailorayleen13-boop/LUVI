"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import {
  AESTHETIC_VALUES,
  INTEREST_VALUES,
  type Aesthetic,
  type Interest,
} from "@/lib/marketplace/types";
import { AESTHETIC_VISUALS, INTEREST_VISUALS } from "@/lib/marketplace/taste/vocabulary";
import { t } from "@/lib/i18n";
import { saveOnboardingAction, skipOnboardingAction } from "@/lib/marketplace/taste/actions";

const MIN_INTERESTS = 5;

interface OnboardingViewProps {
  initialInterests: Interest[];
  initialAesthetics: Aesthetic[];
  redirectTo?: string;
  /** "edit" (reached from Account's "Tus gustos") skips the intro screen and uses different confirmation copy — never a second signup flow. */
  mode?: "create" | "edit";
}

/**
 * "Hacé LUVI tuyo" — a short, visual, multi-step flow, not a settings
 * form: every screen is image-oriented preference cards (emoji over a
 * tinted gradient today — see taste/vocabulary.ts's docstring on why, and
 * how to swap in real photography later), never a checkbox list. All
 * steps share ONE <form> the whole time (see the sr-only checkboxes
 * inside each step) — moving between steps only toggles which step's
 * cards are visible via CSS, so nothing needs to be assembled or
 * round-tripped through client state at submit time; clicking the final
 * screen's CTA is a plain form submit straight to saveOnboardingAction.
 *
 * "Omitir" is available from every step, deliberately styled as a quiet
 * text link — never the same visual weight as the step's primary CTA
 * (Taste Profile Section 6) — so it reads as "not now", not as an equally
 * valid alternative to personalizing.
 */
export function OnboardingView({
  initialInterests,
  initialAesthetics,
  redirectTo = "/",
  mode = "create",
}: OnboardingViewProps) {
  const steps = mode === "edit" ? (["interests", "aesthetics", "done"] as const) : (["intro", "interests", "aesthetics", "done"] as const);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  const [selectedInterests, setSelectedInterests] = useState<Set<Interest>>(new Set(initialInterests));
  const [selectedAesthetics, setSelectedAesthetics] = useState<Set<Aesthetic>>(new Set(initialAesthetics));

  const remainingForMin = Math.max(0, MIN_INTERESTS - selectedInterests.size);
  const canContinueFromInterests = remainingForMin === 0;

  function toggleInterest(value: Interest) {
    setSelectedInterests((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function toggleAesthetic(value: Aesthetic) {
    setSelectedAesthetics((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const doneTitle = mode === "edit" ? t.onboarding.editDoneTitle : t.onboarding.doneTitle;
  const doneSubtitle = mode === "edit" ? t.onboarding.editDoneSubtitle : t.onboarding.doneSubtitle;

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 pt-[calc(24px+env(safe-area-inset-top))] lg:mx-auto lg:max-w-2xl lg:pt-10">
      <StepDots total={steps.length} current={stepIndex} />

      {step === "intro" && (
        <IntroStep onNext={goNext} redirectTo={redirectTo} />
      )}

      {/* Interests/aesthetics/done stay mounted together inside one <form> so
          every checkbox's checked state is present at submit time regardless
          of which step is currently visible — see the module docstring. */}
      <form action={saveOnboardingAction} className={step === "intro" ? "hidden" : "flex flex-col gap-6"}>
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className={step === "interests" ? "flex flex-col gap-5" : "hidden"}>
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="font-display text-2xl font-bold text-charcoal">{t.onboarding.interestsTitle}</h1>
            <p className="text-[14px] text-charcoal-soft">{t.onboarding.interestsSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {INTEREST_VALUES.map((value) => (
              <PreferenceCard
                key={value}
                name="interest"
                value={value}
                label={t.interest[value]}
                visual={INTEREST_VISUALS[value]}
                active={selectedInterests.has(value)}
                onToggle={() => toggleInterest(value)}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2">
            {remainingForMin > 0 && (
              <p className="text-[12.5px] font-medium text-fucsia-dark">
                {t.onboarding.interestsMinHint(remainingForMin)}
              </p>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinueFromInterests}
              className="w-full rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98] disabled:opacity-40"
            >
              {t.onboarding.continueCta}
            </button>
          </div>
        </div>

        <div className={step === "aesthetics" ? "flex flex-col gap-5" : "hidden"}>
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="font-display text-2xl font-bold text-charcoal">{t.onboarding.aestheticsTitle}</h1>
            <p className="text-[14px] text-charcoal-soft">{t.onboarding.aestheticsSubtitle}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {AESTHETIC_VALUES.map((value) => (
              <PreferenceCard
                key={value}
                name="aesthetic"
                value={value}
                label={t.aesthetic[value]}
                visual={AESTHETIC_VISUALS[value]}
                active={selectedAesthetics.has(value)}
                onToggle={() => toggleAesthetic(value)}
                compact
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="rounded-full px-5 py-3.5 text-[15px] font-semibold text-charcoal-faint"
            >
              {t.common.previous}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex-1 rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98]"
            >
              {t.onboarding.continueCta}
            </button>
          </div>
        </div>

        <div className={step === "done" ? "flex flex-col items-center gap-5 pt-6 text-center" : "hidden"}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
            <Sparkles size={26} className="text-fucsia-dark" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl font-bold text-charcoal">{doneTitle}</h1>
            <p className="max-w-xs text-[14px] text-charcoal-soft">{doneSubtitle}</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98]"
          >
            {mode === "edit" ? t.onboarding.save : t.onboarding.doneCta}
          </button>
        </div>
      </form>

      {step !== "intro" && step !== "done" && (
        <form action={skipOnboardingAction} className="pt-1 text-center">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button type="submit" className="text-[13px] font-medium text-charcoal-faint">
            {t.onboarding.skip}
          </button>
        </form>
      )}
    </div>
  );
}

function IntroStep({ onNext, redirectTo }: { onNext: () => void; redirectTo: string }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fucsia-light">
        <Sparkles size={26} className="text-fucsia-dark" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-bold text-charcoal">{t.onboarding.introTitle}</h1>
        <p className="max-w-xs text-[14px] text-charcoal-soft">{t.onboarding.introSubtitle}</p>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-full bg-fucsia py-3.5 text-[15px] font-semibold text-white shadow-md transition active:scale-[0.98]"
      >
        {t.onboarding.introCta}
      </button>
      <form action={skipOnboardingAction}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className="text-[13px] font-medium text-charcoal-faint">
          {t.onboarding.skip}
        </button>
      </form>
    </div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-fucsia" : "w-1.5 bg-charcoal/10"
          }`}
        />
      ))}
    </div>
  );
}

function PreferenceCard<T extends string>({
  name,
  value,
  label,
  visual,
  active,
  onToggle,
  compact = false,
}: {
  name: string;
  value: T;
  label: string;
  visual: { emoji: string; gradient: string };
  active: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 bg-gradient-to-br text-center transition ${
        visual.gradient
      } ${compact ? "aspect-square p-2" : "aspect-[4/5] p-3"} ${
        active ? "border-fucsia" : "border-transparent"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={active}
        onChange={onToggle}
        className="sr-only"
      />
      <span className={compact ? "text-2xl" : "text-4xl"} aria-hidden>
        {visual.emoji}
      </span>
      <span className={`font-semibold text-charcoal ${compact ? "text-[11.5px]" : "text-[13.5px]"}`}>
        {label}
      </span>
      {active && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-fucsia text-white">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </label>
  );
}
