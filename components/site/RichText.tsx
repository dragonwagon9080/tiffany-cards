import DOMPurify from "isomorphic-dompurify";

export default function RichText({
  content,
  className = "",
}: {
  content?: string;
  className?: string;
}) {
  if (!content) return null;

  const html = DOMPurify.sanitize(content.replace(/\n/g, "<br />"), {
    ADD_ATTR: ["target", "rel"],
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}