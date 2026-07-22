"use client";

import { useEffect, useRef, useState } from "react";

export type TNCEAction = {
  icon: string;
  label: string;
  description?: string;
  danger?: boolean;
  onClick: () => void;
};

type Props = {
  button: React.ReactNode;
  actions: TNCEAction[];
};

export default function TNCEActionMenu({
  button,
  actions,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>
        {button}
      </div>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className="flex w-full items-center gap-3 border-b border-zinc-800 px-4 py-3 text-left text-white transition hover:bg-zinc-900"
            >
              <span className="text-xl">{action.icon}</span>

              <div className="flex flex-col">
  <span
    className={`font-semibold ${
      action.danger ? "text-red-400" : "text-white"
    }`}
  >
    {action.label}
  </span>

  {action.description && (
    <span className="text-sm text-zinc-400">
      {action.description}
    </span>
  )}
</div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full bg-zinc-900 py-3 text-sm font-bold text-gray-300 transition hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}