"use client";

import { useState } from "react";

type Props = {
  reasons?: string[];
  sports?: string[];

  status?: string;
  setStatus?: (value: string) => void;

  cardYear?: string;
  setCardYear?: (value: string) => void;

  sport?: string;
  setSport?: (value: string) => void;

  firstName?: string;
  setFirstName?: (value: string) => void;

  lastName?: string;
  setLastName?: (value: string) => void;

  cardNumber?: string;
  setCardNumber?: (value: string) => void;

  parallel?: string;
  setParallel?: (value: string) => void;

  serialNumber?: string;
  setSerialNumber?: (value: string) => void;

  brand?: string;
  setBrand?: (value: string) => void;

  grade?: string;
  setGrade?: (value: string) => void;

  certNumber?: string;
  setCertNumber?: (value: string) => void;
};

function uniqueOptions(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) =>
      String(value || "").trim()
    )
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();

      if (
        key === "other" ||
        key === "other..."
      ) {
        return false;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function ListSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  customPlaceholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  customPlaceholder: string;
}) {
  const normalizedOptions =
    uniqueOptions(options);

  const valueIsListed =
    !value ||
    normalizedOptions.some(
      (option) =>
        option.toLowerCase() ===
        value.toLowerCase()
    );

  const [
    enteringCustomValue,
    setEnteringCustomValue,
  ] = useState(!valueIsListed);

  return (
    <label className="grid gap-1 text-sm">
      {label}

      <select
        value={
          enteringCustomValue
            ? "__other__"
            : value
        }
        onChange={(event) => {
          const nextValue =
            event.target.value;

          if (
            nextValue === "__other__"
          ) {
            setEnteringCustomValue(true);
            onChange("");
            return;
          }

          setEnteringCustomValue(false);
          onChange(nextValue);
        }}
        className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
      >
        <option value="">
          {placeholder}
        </option>

        {normalizedOptions.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}

        <option value="__other__">
          Other...
        </option>
      </select>

      {enteringCustomValue && (
        <input
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="mt-2 rounded-lg border border-red-500/60 bg-black px-3 py-2 text-white"
          placeholder={customPlaceholder}
          autoFocus
        />
      )}
    </label>
  );
}

export default function CardsAlertProjectForm({
  reasons = [],
  sports = [],

  status = "",
  setStatus,

  cardYear,
  setCardYear,

  sport = "",
  setSport,

  firstName,
  setFirstName,

  lastName,
  setLastName,

  cardNumber,
  setCardNumber,

  parallel,
  setParallel,

  serialNumber,
  setSerialNumber,

  brand,
  setBrand,

  grade,
  setGrade,

  certNumber,
  setCertNumber,
}: Props) {
  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-red-300">
          Card Identity
        </h3>

        <div className="mb-4">
          <ListSelect
            label="Reason for Report"
            value={status}
            onChange={(value) =>
              setStatus?.(value)
            }
            options={reasons}
            placeholder="Select a reason"
            customPlaceholder="Enter the reason for this report"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Year
            <input
              value={cardYear ?? ""}
              onChange={(event) =>
                setCardYear?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="2024"
            />
          </label>

          <ListSelect
            label="Sport"
            value={sport}
            onChange={(value) =>
              setSport?.(value)
            }
            options={sports}
            placeholder="Select a sport"
            customPlaceholder="Enter the sport"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            First Name
            <input
              value={firstName ?? ""}
              onChange={(event) =>
                setFirstName?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Michael"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Last Name
            <input
              value={lastName ?? ""}
              onChange={(event) =>
                setLastName?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Jordan"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-1 text-sm">
          Card #
          <input
            value={cardNumber ?? ""}
            onChange={(event) =>
              setCardNumber?.(
                event.target.value
              )
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="123"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Parallel
            <input
              value={parallel ?? ""}
              onChange={(event) =>
                setParallel?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Gold"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Serial #
            <input
              value={serialNumber ?? ""}
              onChange={(event) =>
                setSerialNumber?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="12/25"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-1 text-sm">
          Brand
          <input
            value={brand ?? ""}
            onChange={(event) =>
              setBrand?.(
                event.target.value
              )
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Panini National Treasures, Topps Chrome - Diamond Moments, Topps Tiffany"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Grade
            <input
              value={grade ?? ""}
              onChange={(event) =>
                setGrade?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="PSA 9, BGS 9.5, Raw, etc."
            />
          </label>

          <label className="grid gap-1 text-sm">
            Cert #
            <input
              value={certNumber ?? ""}
              onChange={(event) =>
                setCertNumber?.(
                  event.target.value
                )
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Certification number"
            />
          </label>
        </div>
      </section>
    </div>
  );
}