"use client";

type Props = {
  contributorName: string;
  setContributorName: (
    value: string
  ) => void;

  contributorEmail: string;
  setContributorEmail: (
    value: string
  ) => void;

  contactLabel?: string;
  contactPlaceholder?: string;
};

export default function ContributorSection({
  contributorName,
  setContributorName,
  contributorEmail,
  setContributorEmail,
  contactLabel = "Your Social Media or Email",
  contactPlaceholder = "Link, @username or email address",
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        Your Name
        <input
          value={contributorName}
          onChange={(event) =>
            setContributorName(
              event.target.value
            )
          }
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-1 text-sm">
        {contactLabel}
        <input
          value={contributorEmail}
          onChange={(event) =>
            setContributorEmail(
              event.target.value
            )
          }
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          placeholder={contactPlaceholder}
        />
      </label>
    </div>
  );
}