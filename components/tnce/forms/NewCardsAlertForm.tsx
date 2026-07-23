"use client";

type Props = {
  mode: "new" | "update" | "missing";
  action: "update" | "similar" | "removal";
  project: "cards-alert";
  projectLabel: string;
  activeObject: any;
  onClose: () => void;
  onSuccess: (submissionId: string) => void;
};

export default function NewCardsAlertForm({
  mode,
  action,
  project,
  projectLabel,
  activeObject,
  onClose,
}: Props) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">
            Add New Card
          </h2>

          <p className="mt-1 text-sm text-neutral-400">
            Submit a new card for review and possible addition to Cards Alert.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-bold text-neutral-300 transition hover:border-red-500 hover:text-white"
        >
          Close
        </button>
      </div>

      <section className="mt-6 rounded-xl border border-red-500/40 bg-red-950/20 p-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-red-300">
          New Cards Alert Form
        </h3>

        <p className="mt-2 text-sm leading-6 text-neutral-300">
          The new-card workflow is connected correctly. We will build the form
          here without changing the existing-card submission workflow.
        </p>

        <div className="mt-6 rounded-lg border border-neutral-700 bg-black p-3 text-xs text-neutral-400">
          <div>Mode: {mode}</div>
          <div>Action: {action}</div>
          <div>Project: {project}</div>
          <div>Project Label: {projectLabel}</div>
          <div>Active Object ID: {activeObject?.id}</div>
        </div>
      </section>
    </>
  );
}