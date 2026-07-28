type Props = {
  className?: string;
};

export default function EbayAffiliateDisclosure({
  className = "",
}: Props) {
  return (
    <p
      className={`text-xs italic leading-relaxed text-zinc-500 ${className}`}
    >
      As an eBay Partner, Tiffany Cards may earn from qualifying purchases made
      through eBay links.
    </p>
  );
}