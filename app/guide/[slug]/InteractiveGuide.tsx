"use client";

import { useMemo, useState } from "react";
import RichText from "@/components/site/RichText";

type GuideStep = {
  guide_slug: string;
  step: string;
  title: string;
  description?: string;
  layout?: string;
  result_image?: string;
  sort_order?: string;
  active?: string;
};

type GuideChoice = {
  guide_slug: string;
  step: string;
  choice_label: string;
  choice_image?: string;
  choice_alt?: string;
  choice_description?: string;
  next_guide_slug?: string;
  next_step?: string;
  sort_order?: string;
  active?: string;
};

type GuideLink = {
  guide_slug: string;
  step: string;
  link_title: string;
  link_image?: string;
  link_url: string;
  link_description?: string;
  sort_order?: string;
  active?: string;
};

type HistoryItem = {
  guideSlug: string;
  step: string;
};

export default function InteractiveGuide({
  steps,
  choices,
  links,
  startingGuideSlug,
  totalSteps,
}: {
  steps: GuideStep[];
  choices: GuideChoice[];
  links: GuideLink[];
  startingGuideSlug: string;
  totalSteps: number;
}) {
  const [currentGuideSlug, setCurrentGuideSlug] = useState(startingGuideSlug);
  const [currentStep, setCurrentStep] = useState("1");
  const [history, setHistory] = useState<HistoryItem[]>([]);
const [openImage, setOpenImage] = useState<string | null>(null);

  const stepMap = useMemo(() => {
    const map = new Map<string, GuideStep>();

    steps.forEach((step) => {
      const key = `${String(step.guide_slug).trim()}::${String(step.step).trim()}`;
      map.set(key, step);
    });

    return map;
  }, [steps]);

  const stepChoices = useMemo(() => {
    return choices
      .filter(
        (choice) =>
          String(choice.guide_slug).trim() === currentGuideSlug &&
          String(choice.step).trim() === currentStep
      )
      .sort(
        (a, b) =>
          Number(a.sort_order || 9999) - Number(b.sort_order || 9999)
      );
  }, [choices, currentGuideSlug, currentStep]);

  const stepLinks = useMemo(() => {
    const currentStepLinks = links.filter(
      (link) =>
        String(link.guide_slug).trim() === currentGuideSlug &&
        String(link.step).trim() === currentStep
    );

    const sharedTiffanyLinks = links.filter(
      (link) =>
        String(link.guide_slug).trim() === "topps-tiffany-affiliates" &&
        String(link.step).trim().toLowerCase() === "shared"
    );

    return [...currentStepLinks, ...sharedTiffanyLinks].sort(
      (a, b) =>
        Number(a.sort_order || 9999) - Number(b.sort_order || 9999)
    );
  }, [links, currentGuideSlug, currentStep]);

  const step = stepMap.get(`${currentGuideSlug}::${currentStep}`);

  function goToChoice(choice: GuideChoice) {
    if (!choice.next_step && !choice.next_guide_slug) return;

    setHistory((prev) => [
      ...prev,
      {
        guideSlug: currentGuideSlug,
        step: currentStep,
      },
    ]);

    setCurrentGuideSlug(
  String(choice.next_guide_slug || currentGuideSlug).trim()
);
setCurrentStep(String(choice.next_step || "1").trim());

setTimeout(() => {
  document.getElementById("guide-step-title")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}, 100);
  }

  function goBack() {
    const previous = history[history.length - 1];
    if (!previous) return;

    setCurrentGuideSlug(previous.guideSlug);
    setCurrentStep(previous.step);
    setHistory((prev) => prev.slice(0, -1));
  }

  function restartGuide() {
    setCurrentGuideSlug(startingGuideSlug);
    setCurrentStep("1");
    setHistory([]);
  }

  if (!steps.length) {
    return (
      <div className="rounded-xl border border-[#22c55e]/40 bg-neutral-950 p-8 text-center">
        <h2 className="text-2xl font-bold text-[#22c55e]">
          Interactive Guide Coming Soon
        </h2>
        <p className="mt-4 text-gray-300">
          This guide is set up, but no steps have been added yet.
        </p>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-neutral-950 p-8 text-center">
        <h2 className="text-2xl font-bold text-red-400">Step Not Found</h2>
        <p className="mt-4 text-gray-300">
          Missing step: {currentGuideSlug} / {currentStep}
        </p>

        <button
          onClick={restartGuide}
          className="mt-6 rounded bg-[#22c55e] px-6 py-3 font-bold text-black"
        >
          Restart Guide
        </button>
      </div>
    );
  }

  const isResult = String(step.layout || "").toLowerCase() === "result";

  const currentStepNumber = Number(currentStep) || totalSteps;
  const safeTotalSteps = totalSteps > 0 ? totalSteps : 5;

  const progressPercent = isResult
    ? 100
    : Math.min((currentStepNumber / safeTotalSteps) * 100, 100);

  return (
    <div className="rounded-2xl border border-[#22c55e]/40 bg-neutral-950 p-6 shadow-2xl md:p-10">
      {/* PROGRESS BAR */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-gray-400">
          <span>
            {isResult
              ? "Result"
              : `Step ${currentStepNumber} of ${safeTotalSteps}`}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-[#22c55e] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* RESULT IMAGE */}
      {step.result_image && (
        <img
          src={step.result_image}
          alt={step.title}
          className="mx-auto mb-8 max-h-[460px] rounded-lg object-contain shadow-xl"
        />
      )}

      {/* WIZARD HEADER */}
      <div
  id="guide-step-title"
  className="scroll-mt-28 mx-auto max-w-4xl border-y border-[#22c55e]/40 py-5 text-center"
>
        <div className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-[#d4af37]">
          {isResult ? "Guide Result" : "Guide Step"}
        </div>

        <RichText
  content={step.title}
  className="text-2xl font-black uppercase leading-tight tracking-wide text-[#22c55e] sm:text-3xl md:text-4xl [&_span]:break-words"
/>
      </div>

      {/* DESCRIPTION */}
      {step.description && (
        <RichText
  content={step.description}
  className="mx-auto mt-8 max-w-3xl text-left text-lg leading-8 text-gray-300"
/>
      )}

            {/* RESULT EXAMPLE OF TIFFANY IMAGES */}
      {isResult && stepChoices.length > 0 && (
        <div className="mt-12">
          <h3 className="text-center text-2xl font-bold uppercase tracking-wide text-[#22c55e]">
            SEE EXAMPLE OF TIFFANY IMAGES BELOW
          </h3>

          <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {stepChoices.map((choice) => (
              <div
                key={`${choice.guide_slug}-${choice.step}-${choice.choice_label}-${choice.sort_order}`}
                className="rounded-xl border border-[#22c55e]/20 bg-neutral-950 p-4 text-center"
              >
                {choice.choice_image && (
                  <button
                    type="button"
                  onClick={() => setOpenImage(choice.choice_image || null)}
                    className="flex h-[450px] w-full cursor-zoom-in items-center justify-center rounded-lg bg-black"
                  >
                    <img
                      src={choice.choice_image}
                      alt={choice.choice_alt || choice.choice_label}
                      className="max-h-full max-w-full object-contain shadow-xl transition duration-300 hover:scale-105"
                    />
                  </button>
                )}

                <RichText
                  content={choice.choice_label}
                  className="mt-5 text-lg font-bold uppercase tracking-wide text-[#22c55e]"
                />

                

                {choice.choice_description && (
                  <RichText
                    content={choice.choice_description}
                    className="mx-auto mt-4 max-w-[280px] text-sm leading-6 text-gray-300"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE MODAL */}
      {openImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenImage(null)}
        >
          <button
            type="button"
            onClick={() => setOpenImage(null)}
            className="absolute right-6 top-6 text-4xl font-bold text-white hover:text-[#d4af37]"
          >
            ×
          </button>

          <img
            src={openImage}
            alt="Full size example"
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* IMAGE CHOICES */}
      {!isResult && stepChoices.length > 0 && (
        <div className="mt-12 grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {stepChoices.map((choice) => (
            <button
              key={`${choice.guide_slug}-${choice.step}-${choice.choice_label}-${choice.sort_order}`}
              onClick={() => goToChoice(choice)}
              className={`group ${
  currentStep === "1" ? "max-w-[220px] mx-auto" : "w-full"
} cursor-pointer rounded-xl border border-transparent bg-neutral-950 px-2 py-4 text-center transition duration-300 hover:border-[#22c55e]/50 hover:bg-neutral-900`}
            >
              {choice.choice_image && (
  <img
    src={choice.choice_image}
    alt={choice.choice_alt || choice.choice_label}
    className={`mx-auto ${
  currentStep === "1" ? "w-3/4" : "w-3/4"
} rounded-lg object-contain shadow-xl transition duration-300 group-hover:scale-105 group-hover:shadow-2xl`}
  />
)}

              <RichText
                content={choice.choice_label}
                className="mt-5 text-lg font-bold uppercase tracking-wide text-[#22c55e] transition duration-300 group-hover:text-[#d4af37]"
              />

              <div className="mx-auto mt-2 h-[2px] w-0 bg-[#d4af37] transition-all duration-300 group-hover:w-3/4" />

              {choice.choice_description && (
                <RichText
                  content={choice.choice_description}
                  className="mx-auto mt-4 max-w-[280px] text-sm leading-6 text-gray-300"
                />
              )}

                          </button>
          ))}
        </div>
      )}

      {!isResult && stepChoices.length === 0 && (
        <p className="mt-8 text-center text-gray-400">
          No choices have been added for this step yet.
        </p>
      )}

      {/* CONTROLS */}
      <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          onClick={goBack}
          disabled={history.length === 0}
          className="rounded-lg border border-[#22c55e] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#22c55e] transition hover:border-[#d4af37] hover:text-[#d4af37] disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-600"
        >
          ← Previous Step
        </button>

        <button
          onClick={restartGuide}
          className="rounded-lg border border-[#d4af37] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#d4af37] transition hover:bg-[#d4af37] hover:text-black"
        >
          Restart Guide
        </button>
      </div>

      {/* AFFILIATE / RESOURCE LINKS */}
      {isResult && stepLinks.length > 0 && (
        <div className="mt-16 border-t border-[#22c55e]/30 pt-10">
          <div className="mx-auto mb-8 max-w-4xl rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/12 px-6 py-4 text-left text-sm leading-6 text-gray-200">
            <span className="font-bold uppercase tracking-wide text-[#22c55e]">
              Affiliate Disclosure:
            </span>{" "}
            Some links may be affiliate links. If you make a purchase through
            these links, Tiffany Cards may earn a commission at no additional
            cost to you.
          </div>

          <h3 className="text-center text-2xl font-bold uppercase tracking-wide text-[#d4af37]">
            View Listings
          </h3>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {stepLinks.map((link, index) => (
              <a
                key={`${link.guide_slug}-${link.step}-${link.link_title}-${link.sort_order}-${index}`}
                href={link.link_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="group text-center transition"
              >
                {link.link_image && (
                  <img
                    src={link.link_image}
                    alt={link.link_title}
                    className="mx-auto w-3/4 rounded-lg border-2 border-[#d4af37] shadow-xl transition duration-300 group-hover:scale-105"
                  />
                )}

                <RichText
                  content={link.link_title}
                  className="mt-5 text-lg font-bold uppercase tracking-wide text-[#d4af37]"
                />

                {link.link_description && (
                  <RichText
                    content={link.link_description}
                    className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-gray-300"
                  />
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}