"use client";

import { useState } from "react";
import ContributionForm from "./ContributionForm";
import SuccessScreen from "./SuccessScreen";

type Project = "rpa-tracker" | "cards-alert" | "tiffany-cards" | "guides";
type ContributionMode = "new" | "update" | "missing";
type ContributionAction =
  | "update"
  | "similar"
  | "removal";

type ActiveObject = {
  id?: string;
  title?: string;
  [key: string]: any;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: ContributionMode;
action?: ContributionAction;
project: Project;
  projectLabel: string;
  logoUrl?: string;
  activeObject: ActiveObject;
};

export default function ContributionModal({
  open,
  onClose,
  mode = "new",
action = "update",
project,
  projectLabel,
  logoUrl,
  activeObject,
}: Props) {
  const [successSubmissionId, setSuccessSubmissionId] = useState("");

  if (!open) return null;

  function contributeAnother() {
    setSuccessSubmissionId("");
  }

  function closeModal() {
    setSuccessSubmissionId("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-white shadow-2xl">
        {successSubmissionId ? (
          <SuccessScreen
            logoUrl={logoUrl}
            submissionId={successSubmissionId}
            onContributeAnother={contributeAnother}
            onClose={closeModal}
          />
        ) : (
          <ContributionForm
  mode={mode}
  action={action}
  project={project}
            projectLabel={projectLabel}
            activeObject={activeObject}
            onClose={closeModal}
            onSuccess={setSuccessSubmissionId}
          />
        )}
      </div>
    </div>
  );
}