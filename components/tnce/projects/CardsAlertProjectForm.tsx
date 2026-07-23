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

  parallel?: string;
  setParallel?: (value: string) => void;

  serialNumber?: string;
  setSerialNumber?: (value: string) => void;

  brand?: string;
  setBrand?: (value: string) => void;

  sport?: string;
  setSport?: (value: string) => void;

  status?: string;
  setStatus?: (value: string) => void;
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
  parallel,
  setParallel,
  serialNumber,
  setSerialNumber,
  brand,
  setBrand,
  sport,
  setSport,
  status,
  setStatus,
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
              onChange={(event) => setCardYear?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="2024"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Card #
            <input
              value={cardNumber ?? ""}
              onChange={(event) => setCardNumber?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="123"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            First Name
            <input
              value={firstName ?? ""}
              onChange={(event) => setFirstName?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Last Name
            <input
              value={lastName ?? ""}
              onChange={(event) => setLastName?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Parallel
            <input
              value={parallel ?? ""}
              onChange={(event) => setParallel?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Gold"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Serial #
            <input
              value={serialNumber ?? ""}
              onChange={(event) => setSerialNumber?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="12/25"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          Brand
          <input
            value={brand ?? ""}
            onChange={(event) => setBrand?.(event.target.value)}
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Panini National Treasures or Topps Chrome - Diamond Moments"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Sport
            <input
              value={sport ?? ""}
              onChange={(event) => setSport?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Basketball"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Status
            <input
              value={status ?? ""}
              onChange={(event) => setStatus?.(event.target.value)}
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="Altered"
            />
          </label>
        </div>
      </section>
    </div>
  );
}