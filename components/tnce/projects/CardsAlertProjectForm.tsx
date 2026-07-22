"use client";

type Props = {
  cardYear?: string;
  setCardYear?: (value: string) => void;

  firstName?: string;
  setFirstName?: (value: string) => void;

  lastName?: string;
  setLastName?: (value: string) => void;

  cardNumber?: string;
  setCardNumber?: (value: string) => void;

  brand?: string;
  setBrand?: (value: string) => void;

  manufacturer?: string;
  setManufacturer?: (value: string) => void;

  setName?: string;
  setSetName?: (value: string) => void;

  subset?: string;
  setSubset?: (value: string) => void;

  parallel?: string;
  setParallel?: (value: string) => void;

  sport?: string;
  setSport?: (value: string) => void;
};

export default function CardsAlertProjectForm({
  cardYear,
  setCardYear,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  cardNumber,
  setCardNumber,
  brand,
  setBrand,
  manufacturer,
  setManufacturer,
  setName,
  setSetName,
  subset,
  setSubset,
  parallel,
  setParallel,
  sport,
  setSport,
}: Props) {
  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-red-300">
          Card Identity
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Year

            <input
              value={cardYear ?? ""}
              onChange={(event) =>
                setCardYear?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="2024"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Sport

            <input
              value={sport ?? ""}
              onChange={(event) =>
                setSport?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Basketball"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            First Name

            <input
              value={firstName ?? ""}
              onChange={(event) =>
                setFirstName?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Last Name

            <input
              value={lastName ?? ""}
              onChange={(event) =>
                setLastName?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Card Number

            <input
              value={cardNumber ?? ""}
              onChange={(event) =>
                setCardNumber?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Brand

            <input
              value={brand ?? ""}
              onChange={(event) =>
                setBrand?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Topps"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Manufacturer

            <input
              value={manufacturer ?? ""}
              onChange={(event) =>
                setManufacturer?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Set

            <input
              value={setName ?? ""}
              onChange={(event) =>
                setSetName?.(event.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          Subset

          <input
            value={subset ?? ""}
            onChange={(event) =>
              setSubset?.(event.target.value)
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Parallel

          <input
            value={parallel ?? ""}
            onChange={(event) =>
              setParallel?.(event.target.value)
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          />
        </label>
      </section>
    </div>
  );
}