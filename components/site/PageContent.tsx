/* =========================================================
   PAGE CONTENT
   Standard content container used across TiffanyCards.com
   ========================================================= */

export default function PageContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`mx-auto max-w-5xl px-6 py-14 ${className}`}
    >
      {children}
    </section>
  );
}