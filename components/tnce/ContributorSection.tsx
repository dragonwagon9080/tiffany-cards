"use client";

type Props = {
  contributorName: string;
  setContributorName: (value: string) => void;
  contributorEmail: string;
  setContributorEmail: (value: string) => void;
};

export default function ContributorSection({
  contributorName,
  setContributorName,
  contributorEmail,
  setContributorEmail,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        Your Name
        <input
          value={contributorName}
          onChange={(e) => setContributorName(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
        />
      </label>

      <label className="grid gap-1 text-sm">
        Your Email
        <input
          value={contributorEmail}
          onChange={(e) => setContributorEmail(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
        />
      </label>
    </div>
  );
}