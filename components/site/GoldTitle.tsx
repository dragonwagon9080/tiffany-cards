/* =========================================================
   GOLD TITLE
   Reusable premium title style for hero/page headings
   ========================================================= */

export default function GoldTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`gold-title text-4xl uppercase tracking-[0.08em] md:text-6xl ${className}`}
    >
      {children}
    </h1>
  );
}