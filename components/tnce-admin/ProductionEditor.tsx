"use client";

import type { TNCEProductionFields } from "@/lib/tnce/types";

type Props = {
  original: TNCEProductionFields;
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
};

const TEXT_FIELDS: FieldConfig[] = [
  {
    name: "Card_Title",
    label: "Card Title",
    placeholder: "Year, player, card number, brand...",
  },
  {
    name: "Serial_Number",
    label: "Serial Number",
    placeholder: "Example: 07/25",
  },
  {
    name: "Variation_Input",
    label: "Variation",
    placeholder: "Example: Gold",
  },
  {
    name: "Grade",
    label: "Grade",
    placeholder: "Example: PSA 10",
  },
  {
    name: "Cert_Number",
    label: "Cert Number",
    placeholder: "Certification number",
  },
];

const IMAGE_FIELDS: FieldConfig[] = [
  {
    name: "Front_Image",
    label: "Front Image URL",
    placeholder: "https://...",
  },
  {
    name: "Back_Image",
    label: "Back Image URL",
    placeholder: "https://...",
  },
  {
    name: "Other_Images",
    label: "Other Image URLs",
    multiline: true,
    rows: 4,
    placeholder: "Enter one image URL per line",
  },
];

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function EditableField({
  config,
  originalValue,
  value,
  onChange,
}: {
  config: FieldConfig;
  originalValue: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const changed =
    normalize(value) !== normalize(originalValue);

  const commonClassName = [
    "w-full rounded-lg border bg-neutral-950 px-3 py-2 text-sm text-white outline-none transition",
    "placeholder:text-neutral-600",
    changed
      ? "border-[#d4af37] bg-[#181300] shadow-[0_0_12px_rgba(212,175,55,.12)]"
      : "border-neutral-700 focus:border-[#d4af37]",
  ].join(" ");

  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
        <span>{config.label}</span>

        {changed && (
          <span className="text-[10px] text-[#d4af37]">
            Edited
          </span>
        )}
      </span>

      {config.multiline ? (
        <textarea
          value={value}
          rows={config.rows || 3}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={config.placeholder}
          className={`${commonClassName} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={config.placeholder}
          className={commonClassName}
        />
      )}
    </label>
  );
}

export default function ProductionEditor({
  original,
  value,
  onChange,
}: Props) {
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

  const changedFields = (
    Object.keys(value) as FieldName[]
  ).filter(
    (field) =>
      normalize(value[field]) !==
      normalize(original[field])
  );

  return (
    <div className="rounded-xl border border-neutral-800 bg-black p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-white">
            Production Data
          </h3>

          <p className="mt-1 text-xs text-neutral-500">
            These values will be published.
          </p>
        </div>

        {changedFields.length > 0 && (
          <button
            type="button"
            onClick={resetRecord}
            className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-300 transition hover:border-[#d4af37] hover:text-white"
          >
            Reset
          </button>
        )}
      </div>

      {changedFields.length > 0 && (
        <div className="mt-3 rounded-lg border border-[#9c7a2d]/60 bg-[#181300] px-3 py-2 text-xs text-[#f1d36b]">
          {changedFields.length} field
          {changedFields.length === 1 ? "" : "s"} edited
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {TEXT_FIELDS.map((config) => (
          <EditableField
            key={config.name}
            config={config}
            originalValue={original[config.name]}
            value={value[config.name]}
            onChange={(nextValue) =>
              updateField(config.name, nextValue)
            }
          />
        ))}

        <EditableField
          config={{
            name: "Card_History",
            label: "Card History",
            multiline: true,
            rows: 4,
            placeholder: "Card grading and auction history",
          }}
          originalValue={original.Card_History}
          value={value.Card_History}
          onChange={(nextValue) =>
            updateField("Card_History", nextValue)
          }
        />
      </div>

      <div className="my-4 border-t border-neutral-800" />

      <div className="mb-3 text-xs font-black uppercase tracking-wide text-neutral-400">
        Production Images
      </div>

      <div className="grid gap-3">
        {IMAGE_FIELDS.map((config) => (
          <EditableField
            key={config.name}
            config={config}
            originalValue={original[config.name]}
            value={value[config.name]}
            onChange={(nextValue) =>
              updateField(config.name, nextValue)
            }
          />
        ))}
      </div>
    </div>
  );
}