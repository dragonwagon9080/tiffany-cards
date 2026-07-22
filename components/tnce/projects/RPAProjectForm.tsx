"use client";

type ActiveObject = {
  id?: string;
  title?: string;
  [key: string]: any;
};

type Props = {
  activeObject: ActiveObject;

  cardTitle: string;

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

export default function RPAProjectForm({
  activeObject,
  cardTitle,
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

  if (isContextAware) {
    return (
      <div className="rounded-xl border border-blue-500/40 bg-blue-950/20 p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-300">
          Contribution Context
        </div>

        <div className="grid gap-3 text-sm">
          {cardTitle && (
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">
                Card
              </div>

              <div className="mt-1 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white">
                {cardTitle}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {activeSerial && (
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-400">
                  Serial Number
                </div>

                <div className="mt-1 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white">
                  {activeSerial}
                </div>
              </div>
            )}

            {activeVariation && (
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-400">
                  Variation
                </div>

                <div className="mt-1 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white">
                  {activeVariation}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                Updated Grade
              </span>

              <input
                value={grade}
                onChange={(event) =>
                  setGrade(event.target.value)
                }
                className="rounded-lg border border-blue-500/50 bg-black px-3 py-2 text-white"
                placeholder="Example: PSA 10"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                Updated Cert #
              </span>

              <input
                value={certNumber}
                onChange={(event) =>
                  setCertNumber(
                    event.target.value
                  )
                }
                className="rounded-lg border border-blue-500/50 bg-black px-3 py-2 text-white"
                placeholder="Example: 123456789"
              />
            </label>
          </div>

          {activeCardId && (
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">
                Card ID
              </div>

              <div className="mt-1 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white">
                {activeCardId}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-neutral-400">
          This card was detected from the page you
          are viewing. Update the grade, cert
          number, notes, or images as needed.
        </p>
      </div>
    );
  }

  return (
    <>
      <label className="grid gap-1 text-sm">
        Card Title / Player / Set

        <input
          value={cardTitle}
          readOnly
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          placeholder="Example: 2024 Caitlin Clark National Treasures RPA"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Serial Number

          <input
            value={serialNumber}
            onChange={(event) =>
              setSerialNumber(
                event.target.value
              )
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Example: 4/5"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Variation

          <input
            value={variation}
            onChange={(event) =>
              setVariation(event.target.value)
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Example: Gold"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Grade

          <input
            value={grade}
            onChange={(event) =>
              setGrade(event.target.value)
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Example: PSA 10"
          />
        </label>

        <label className="grid gap-1 text-sm">
          Cert #

          <input
            value={certNumber}
            onChange={(event) =>
              setCertNumber(
                event.target.value
              )
            }
            className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
            placeholder="Example: 123456789"
          />
        </label>
      </div>
    </>
  );
}