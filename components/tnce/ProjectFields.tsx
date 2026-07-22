"use client";

import RPAProjectForm from "./projects/RPAProjectForm";

type ActiveObject = {
  id?: string;
  title?: string;
  [key: string]: any;
};

type CardsAlertFields = {
  cardYear: string;
  setCardYear: (value: string) => void;

  firstName: string;
  setFirstName: (value: string) => void;

  lastName: string;
  setLastName: (value: string) => void;

  cardNumber: string;
  setCardNumber: (value: string) => void;

  brand: string;
  setBrand: (value: string) => void;

  manufacturer: string;
  setManufacturer: (value: string) => void;

  setName: string;
  setSetName: (value: string) => void;

  subset: string;
  setSubset: (value: string) => void;

  parallel: string;
  setParallel: (value: string) => void;

  sport: string;
  setSport: (value: string) => void;

  status: string;
  setStatus: (value: string) => void;

  suspect: string;
  setSuspect: (value: string) => void;

  description: string;
  setDescription: (value: string) => void;

  cost: string;
  setCost: (value: string) => void;

  previousGrade: string;
  setPreviousGrade: (value: string) => void;

  previousCertNumber: string;
  setPreviousCertNumber: (value: string) => void;

  previousSourceUrl: string;
  setPreviousSourceUrl: (value: string) => void;

  attributionType:
    | "anonymous"
    | "public-source"
    | "my-post";

  setAttributionType: (
    value:
      | "anonymous"
      | "public-source"
      | "my-post"
  ) => void;

  publicSourceUrl: string;
  setPublicSourceUrl: (value: string) => void;
};

type Props = {
  project:
    | "rpa-tracker"
    | "cards-alert"
    | "tiffany-cards"
    | "guides";

  activeObject: ActiveObject;

  cardsAlertFields?: CardsAlertFields;

  cardTitle: string;
  setCardTitle: (value: string) => void;

  serialNumber: string;
  setSerialNumber: (value: string) => void;

  variation: string;
  setVariation: (value: string) => void;

  grade: string;
  setGrade: (value: string) => void;

  certNumber: string;
  setCertNumber: (value: string) => void;
};

function valueFromActiveObject(
  activeObject: ActiveObject,
  keys: string[]
) {
  for (const key of keys) {
    if (activeObject[key]) {
      return String(activeObject[key]);
    }
  }

  return "";
}

function isPlaceholderContext(
  activeObject: ActiveObject
) {
  const id = String(
    activeObject?.id || ""
  ).toLowerCase();

  const title = String(
    activeObject?.title || ""
  ).toLowerCase();

  return (
    id === "rpa-tracker-main-page" ||
    id === "rpa-tracker-home" ||
    title === "rpa tracker main page" ||
    title === "rpa tracker home"
  );
}

export default function ProjectFields({
  project,
  activeObject,
  cardsAlertFields,
  cardTitle,
  setCardTitle,
  serialNumber,
  setSerialNumber,
  variation,
  setVariation,
  grade,
  setGrade,
  certNumber,
  setCertNumber,
}: Props) {

  const activeTitle = valueFromActiveObject(
    activeObject,
    [
      "Card_Title_Display",
      "Card_Title",
      "title",
    ]
  );

  const activeSerial = valueFromActiveObject(
    activeObject,
    [
      "Serial_Number",
      "serialNumber",
      "serial",
    ]
  );

  const activeCardId = valueFromActiveObject(
    activeObject,
    [
      "Card_id",
      "card_id",
      "id",
    ]
  );

  const activeVariation =
    valueFromActiveObject(activeObject, [
      "Variation_Input",
      "Variation",
      "variation",
    ]);

const isContextAware =
  !isPlaceholderContext(activeObject) &&
  (Boolean(activeTitle) ||
    Boolean(activeSerial) ||
    Boolean(activeCardId) ||
    Boolean(activeVariation));

  const {
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
  status,
  setStatus,
  suspect,
  setSuspect,
  description,
  setDescription,
  cost,
  setCost,
  previousGrade,
  setPreviousGrade,
  previousCertNumber,
  setPreviousCertNumber,
  previousSourceUrl,
  setPreviousSourceUrl,
  attributionType,
  setAttributionType,
  publicSourceUrl,
  setPublicSourceUrl,
} = cardsAlertFields ?? {};

if (project === "rpa-tracker") {
  return (
    <RPAProjectForm
      activeObject={activeObject}
      cardTitle={cardTitle}
      serialNumber={serialNumber}
      setSerialNumber={setSerialNumber}
      variation={variation}
      setVariation={setVariation}
      grade={grade}
      setGrade={setGrade}
      certNumber={certNumber}
      setCertNumber={setCertNumber}
    />
  );
}

if (project === "cards-alert") {
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
              onChange={(e) =>
                setCardYear?.(e.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="2024"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Sport
            <input
              value={sport ?? ""}
              onChange={(e) =>
                setSport?.(e.target.value)
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
              onChange={(e) =>
                setFirstName?.(e.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Last Name
            <input
              value={lastName ?? ""}
              onChange={(e) =>
                setLastName?.(e.target.value)
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
              onChange={(e) =>
                setCardNumber?.(e.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
              placeholder="123"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Brand
            <input
              value={brand ?? ""}
              onChange={(e) =>
                setBrand?.(e.target.value)
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
              onChange={(e) =>
                setManufacturer?.(e.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="grid gap-1 text-sm">
            Set
            <input
              value={setName ?? ""}
              onChange={(e) =>
                setSetName?.(e.target.value)
              }
              className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          Subset
          <input
            value={subset ?? ""}
            onChange={(e) =>
              setSubset?.(e.target.value)
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Parallel
          <input
            value={parallel ?? ""}
            onChange={(e) =>
              setParallel?.(e.target.value)
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          />
        </label>
      </section>
    </div>
  );
}
return null;
    
}