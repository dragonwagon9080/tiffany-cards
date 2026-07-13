"use client";

type Props = {
  frontImage: string;
  setFrontImage: (value: string) => void;
  backImage: string;
  setBackImage: (value: string) => void;
  otherImages: string;
  setOtherImages: (value: string) => void;
};

export default function ImageSection({
  frontImage,
  setFrontImage,
  backImage,
  setBackImage,
  otherImages,
  setOtherImages,
}: Props) {
  return (
    <>
      <label className="grid gap-1 text-sm">
        Front Image URL
        <input
          value={frontImage}
          onChange={(e) => setFrontImage(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          placeholder="https://..."
        />
      </label>

      <label className="grid gap-1 text-sm">
        Back Image URL
        <input
          value={backImage}
          onChange={(e) => setBackImage(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          placeholder="https://..."
        />
      </label>

      <label className="grid gap-1 text-sm">
        Additional Image URLs
        <textarea
          value={otherImages}
          onChange={(e) => setOtherImages(e.target.value)}
          className="min-h-24 rounded-lg border border-neutral-700 bg-black px-3 py-2 text-white"
          placeholder="Paste one image URL per line"
        />
      </label>
    </>
  );
}