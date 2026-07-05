"use client";

import { useState } from "react";

type CopyFieldProps = {
  label?: string;
  value: string | number | null | undefined;
  copyValue?: string | number | null | undefined;
  className?: string;
  copiedLabel?: string;
  showIcon?: boolean;
};

export default function CopyField({
  label,
  value,
  copyValue,
  className = "",
  copiedLabel = "Copied!",
  showIcon = true,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const visibleValue = String(value ?? "").trim();
  const clipboardValue = String(copyValue ?? value ?? "").trim();

  if (!visibleValue) return null;

  async function copy() {
    if (!clipboardValue) return;

    try {
      await navigator.clipboard.writeText(clipboardValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Click to copy"
      className={[
        "inline-flex max-w-full items-center gap-1 text-left",
        "select-text rounded px-1 transition",
        "hover:bg-white/10 hover:text-white",
        className,
      ].join(" ")}
    >
      {label && <span className="font-bold">{label}</span>}
      <span className="break-words">{visibleValue}</span>
      {showIcon && <span className="text-xs opacity-60">📋</span>}
      {copied && (
        <span className="ml-1 text-xs font-bold text-green-400">
          {copiedLabel}
        </span>
      )}
    </button>
  );
}