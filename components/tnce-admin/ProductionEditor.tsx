"use client";

import { useState } from "react";

import type { TNCEProductionFields } from "@/lib/tnce/types";

type Props = {
  original: TNCEProductionFields;
  submitted: Partial<TNCEProductionFields>;
  value: TNCEProductionFields;
  onChange: (value: TNCEProductionFields) => void;
};

type FieldName = keyof TNCEProductionFields;

type FieldConfig = {
  name: FieldName;
  label: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  section: "data" | "images";
};

const FIELDS: FieldConfig[] = [
  {
    name: "Card_Title",
    label: "Card Title",
    placeholder: "Year, player, card number, brand...",
    section: "data",
  },
  {
    name: "Serial_Number",
    label: "Serial Number",
    placeholder: "Example: 07/25",
    section: "data",
  },
  {
    name: "Variation_Input",
    label: "Variation",
    placeholder: "Example: Gold",
    section: "data",
  },
  {
    name: "Grade",
    label: "Grade",
    placeholder: "Example: PSA 10",
    section: "data",
  },
  {
    name: "Cert_Number",
    label: "Cert Number",
    placeholder: "Certification number",
    section: "data",
  },
  {
    name: "Card_History",
    label: "Card History",
    multiline: true,
    rows: 5,
    placeholder: "Card grading and auction history",
    section: "data",
  },
  {
    name: "Front_Image",
    label: "Front Image URL",
    placeholder: "https://...",
    section: "images",
  },
  {
    name: "Back_Image",
    label: "Back Image URL",
    placeholder: "https://...",
    section: "images",
  },
  {
    name: "Other_Images",
    label: "Other Image URLs",
    multiline: true,
    rows: 4,
    placeholder: "Enter one image URL per line",
    section: "images",
  },
];

const REVIEW_GROUPS = [
  {
    title: "Card Details",
    fields: [
      "Card_Title",
      "Serial_Number",
      "Variation_Input",
    ] as FieldName[],
  },
  {
    title: "Grading",
    fields: [
      "Grade",
      "Cert_Number",
    ] as FieldName[],
  },
  {
    title: "History",
    fields: [
      "Card_History",
    ] as FieldName[],
  },
  {
    title: "Images",
    fields: [
      "Front_Image",
      "Back_Image",
      "Other_Images",
    ] as FieldName[],
  },
];

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function displayValue(value: unknown) {
  const cleanedValue = String(value ?? "").trim();

  return cleanedValue || "No current value";
}

function ComparisonField({
  config,
  currentValue,
  submittedValue,
  onChange,
}: {
  config: FieldConfig;
  currentValue: string;
  submittedValue: string;
  onChange: (value: string) => void;
}) {
  const changed =
    normalize(submittedValue) !== normalize(currentValue);

  const inputClassName = [
    "w-full rounded-lg border px-3 py-2.5 text-sm text-white outline-none transition",
    "placeholder:text-neutral-600",
    changed
      ? "border-[#d4af37] bg-[#181300] shadow-[0_0_14px_rgba(212,175,55,.12)] focus:border-[#f1d36b]"
      : "border-neutral-700 bg-neutral-950 focus:border-[#d4af37]",
  ].join(" ");

  return (
    <div
      className={[
        "min-w-0 rounded-xl border p-3",
        changed
          ? "border-[#9c7a2d]/70 bg-[#181300]/35"
          : "border-neutral-800 bg-neutral-950/60",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase tracking-wide text-white">
          {config.label}
        </h4>

        {changed && (
          <span className="rounded-full border border-[#d4af37]/50 bg-[#181300] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#f1d36b]">
            Changed
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
  <div className="min-w-0">
    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
      Current
    </div>

    <div className="flex min-h-[44px] items-start rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-neutral-400 whitespace-pre-wrap break-words">
      {displayValue(currentValue)}
    </div>
  </div>

  <label className="grid min-w-0 gap-1">
    <span className="text-[10px] font-bold uppercase tracking-wide text-[#d4af37]">
      Submitted
    </span>

    {config.multiline ? (
      <textarea
        value={submittedValue}
        rows={config.rows || 3}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={config.placeholder}
        className={`${inputClassName} resize-y`}
      />
    ) : (
      <input
        type="text"
        value={submittedValue}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={config.placeholder}
        className={inputClassName}
      />
    )}
  </label>
</div>
    </div>
  );
}

export default function ProductionEditor({
  original,
  submitted,
  value,
  onChange,
}: Props) {
  const [showAllFields, setShowAllFields] =
    useState(false);

  function updateField(
    name: FieldName,
    nextValue: string
  ) {
    onChange({
      ...value,
      [name]: nextValue,
    });
  }

  function resetRecord() {
    onChange({
      ...original,
    });
  }

  const changedFieldNames = FIELDS.filter((field) => {
  const current = normalize(original[field.name]);
  const submittedValue = normalize(submitted[field.name]);

  return current !== submittedValue;
}).map((field) => field.name);

 const visibleFields = showAllFields
  ? FIELDS
  : FIELDS.filter((field) =>
      REVIEW_GROUPS.some((group) => {
        const groupChanged = group.fields.some((name) =>
          changedFieldNames.includes(name)
        );

        return (
          groupChanged &&
          group.fields.includes(field.name)
        );
      })
    );

  const visibleDataFields = visibleFields.filter(
    (field) => field.section === "data"
  );

  const visibleImageFields = visibleFields.filter(
    (field) => field.section === "images"
  );

  const changedCount = changedFieldNames.length;

  return (
    <div className="rounded-xl border border-neutral-800 bg-black p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-white">
            Current vs. Submitted
          </h3>

          <p className="mt-1 text-xs text-neutral-500">
            Submitted values are editable and will be
            published after approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setShowAllFields((current) => !current)
            }
            className="rounded-lg border border-[#9c7a2d] bg-[#181300] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#f1d36b] transition hover:border-[#d4af37] hover:text-white"
          >
            {showAllFields
              ? "Show Changed Only"
              : "Show All Fields"}
          </button>

          {changedCount > 0 && (
            <button
              type="button"
              onClick={resetRecord}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-300 transition hover:border-red-500 hover:text-white"
            >
              Reset to Current
            </button>
          )}
        </div>
      </div>

      <div
        className={[
          "mt-4 rounded-lg border px-3 py-2 text-xs",
          changedCount > 0
            ? "border-[#9c7a2d]/60 bg-[#181300] text-[#f1d36b]"
            : "border-neutral-800 bg-neutral-950 text-neutral-400",
        ].join(" ")}
      >
        {changedCount > 0 ? (
          <>
            Showing{" "}
            {showAllFields
              ? `all ${FIELDS.length} fields`
              : `${changedCount} changed ${
                  changedCount === 1
                    ? "field"
                    : "fields"
                }`}
          </>
        ) : (
          "No submitted fields differ from the current registry record."
        )}
      </div>

      {!showAllFields && changedCount === 0 && (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-center">
          <p className="text-sm text-neutral-400">
            There are no changed fields to display.
          </p>

          <button
            type="button"
            onClick={() => setShowAllFields(true)}
            className="mt-3 rounded-lg border border-[#9c7a2d] bg-[#181300] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#f1d36b]"
          >
            Show All Fields
          </button>
        </div>
      )}

      {visibleDataFields.length > 0 && (
        <div className="mt-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wide text-neutral-400">
            Production Data
          </div>

          <div className="grid gap-3">
            {visibleDataFields.map((config) => (
              <ComparisonField
                key={config.name}
                config={config}
                currentValue={original[config.name]}
                submittedValue={value[config.name]}
                onChange={(nextValue) =>
                  updateField(config.name, nextValue)
                }
              />
            ))}
          </div>
        </div>
      )}

      {visibleImageFields.length > 0 && (
        <div className="mt-5 border-t border-neutral-800 pt-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wide text-neutral-400">
            Production Images
          </div>

          <div className="grid gap-3">
            {visibleImageFields.map((config) => (
              <ComparisonField
                key={config.name}
                config={config}
                currentValue={original[config.name]}
                submittedValue={value[config.name]}
                onChange={(nextValue) =>
                  updateField(config.name, nextValue)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}