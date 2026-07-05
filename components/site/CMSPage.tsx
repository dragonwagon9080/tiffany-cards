import { getPages, getSiteSettings } from "@/lib/cms";
import PageHero from "@/components/site/PageHero";
import UniversalSearchBar from "@/components/shared/UniversalSearchBar";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function linkify(text: string) {
  return text
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      `<a href="$1" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-400 underline hover:text-blue-300">$1</a>`
    )
    .replace(
      /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
      `<a href="mailto:$1" class="font-bold text-blue-400 underline hover:text-blue-300">$1</a>`
    );
}

function formatPageContent(content: any) {
  const text = String(content || "").trim();

  if (!text) return "";

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);

  if (hasHtml) {
    return linkify(text).replace(/\n\s*\n/g, "<br /><br />").replace(/\n/g, "<br />");
  }

  const blocks = text.split(/\n\s*\n/).filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const isList = lines.every((line) => /^[-*•]\s+/.test(line));

      if (isList) {
        return `<ul class="list-disc pl-6 space-y-2">${lines
          .map((line) => `<li>${linkify(escapeHtml(line.replace(/^[-*•]\s+/, "")))}</li>`)
          .join("")}</ul>`;
      }

      return `<p>${linkify(escapeHtml(lines.join("<br />")))}</p>`;
    })
    .join("");
}

export default async function CMSPage({ slug }: { slug: string }) {
  const settings = await getSiteSettings();
  const pages = await getPages();

  const page = pages.find(
    (p: any) =>
      String(p.slug || "").trim().toLowerCase() === slug &&
      String(p.active || "true").toLowerCase() !== "false"
  );

  if (!page) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-center text-white">
        Page not found.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <PageHero
        title={page.title}
        subtitle={page.subtitle}
        heroImage={page.hero_image}
        desktopBorder={page.border_image_desktop || settings.hero_border_image}
        mobileBorder={page.border_image_mobile || settings.hero_border_mobile}
        fallbackTitle={page.title || "Tiffany Cards"}
      />

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <UniversalSearchBar defaultTarget="tiffany" />
      </section>

      <section
        className="mx-auto max-w-4xl px-6 py-12"
        style={{
          backgroundColor: page.bg_color || "transparent",
          color: page.content_color || "#e5e7eb",
        }}
      >
        {page.content && (
          <div
            className="cms-content mx-auto max-w-3xl text-[17px] leading-8 text-gray-200 md:text-lg md:leading-9 [&_a]:font-bold [&_a]:text-blue-400 [&_a]:underline [&_a:hover]:text-blue-300 [&_h1]:mb-8 [&_h1]:text-center [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-[#d4af37] [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#d4af37] [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#d4af37] [&_p]:mb-6 [&_ul]:mb-8 [&_ul]:ml-6 [&_ul]:list-disc [&_li]:mb-2 [&_li]:pl-1 [&_strong]:font-black [&_strong]:text-white"
            dangerouslySetInnerHTML={{
              __html: formatPageContent(page.content),
            }}
          />
        )}

        {page.show_last_updated && page.last_updated && (
          <div className="mx-auto mt-10 max-w-3xl border-t border-[#9c7a2d]/40 pt-6 text-sm italic text-gray-500">
            Last Updated: {page.last_updated}
          </div>
        )}

        {page.button_text && page.button_link && (
          <div className="mt-10 text-center">
            <a
              href={page.button_link}
              className="inline-flex rounded border border-[#d4af37] bg-[#9c7a2d] px-6 py-3 font-bold text-black transition hover:bg-[#b99236]"
            >
              {page.button_text}
            </a>
          </div>
        )}
      </section>
    </main>
  );
}