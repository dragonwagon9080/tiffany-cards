"use client";

import { useState } from "react";

type Props = {
  logoUrl?: string;
  submissionId: string;
  onContributeAnother: () => void;
  onClose: () => void;
};

export default function SuccessScreen({
  logoUrl,
  submissionId,
  onContributeAnother,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copySubmissionId() {
    await navigator.clipboard.writeText(submissionId);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <div className="rounded-2xl border-2 border-[#d4af37] bg-[#181300] p-6 text-center">
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Tiffany Cards"
          className="mx-auto mb-5 h-24 w-24 object-contain"
        />
      )}

      <h2 className="text-3xl font-bold text-[#d4af37]">
        Contribution Submitted!
      </h2>

      <p className="mt-3 text-lg font-semibold text-white">
        Thank you for helping make the hobby safer.
      </p>

      <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-300">
        Every contribution helps improve the Tiffany Cards Network for
        collectors worldwide.
      </p>

      <div className="my-6 border-t border-[#d4af37]/40" />

      <div className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
        Submission ID
      </div>

      <button
        type="button"
        onClick={copySubmissionId}
        className="mx-auto mt-3 block max-w-full rounded-xl border border-[#d4af37]/60 bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-neutral-900"
      >
        {copied ? "✓ Copied!" : `📋 ${submissionId}`}
      </button>

      <div className="my-6 border-t border-[#d4af37]/40" />

      <h3 className="text-lg font-bold text-[#d4af37]">
        What happens next?
      </h3>

      <div className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm text-neutral-200">
        <div>✓ Reviewed by our team</div>
        <div>✓ Verified against existing records</div>
        <div>✓ Published to the live registry if approved</div>
      </div>

      <div className="mt-8 grid gap-3">
        <button
          type="button"
          onClick={onContributeAnother}
          className="rounded-full bg-[#d4af37] px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#f1d36b]"
        >
          + Contribute Another
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-neutral-600 bg-black px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-neutral-800"
        >
          Return to Previous Page
        </button>
      </div>
    </div>
  );
}