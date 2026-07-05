export default function RichText({
  content,
  className = "",
}: {
  content?: string;
  className?: string;
}) {
  if (!content) return null;

  const html = String(content).replace(/\n/g, "<br />");

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}