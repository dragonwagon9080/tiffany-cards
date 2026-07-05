import UniversalSearchBar from "@/components/shared/UniversalSearchBar";
import GradientTitle from "@/components/shared/GradientTitle";
import ShareButton from "@/components/shared/ShareButton";

type Props = {
  section: "RPA Tracker" | "Cards Alert" | "Tiffany Cards";
  title?: string;
  defaultTarget?: "rpa" | "cardsalert" | "tiffany";

  heroImage?: string;
  heroAlt?: string;

  backHref?: string;
  shareType?: "card" | "registry" | "alert" | "guide";
  shareUrl?: string;
  badge?: React.ReactNode;

  children?: React.ReactNode;
};

export default function UniversalPageHeader({
  section,
  title,
  defaultTarget = "tiffany",
  heroImage,
  heroAlt,
  backHref,
  shareType,
  shareUrl,
  badge,
  children,
}: Props) {
  const sectionColor =
    section === "RPA Tracker"
      ? "from-[#60a5fa] via-[#2563eb] to-[#1e3a8a]"
      : section === "Cards Alert"
      ? "from-[#fca5a5] via-[#dc2626] to-[#7f1d1d]"
      : "from-[#fff6c4] via-[#d4af37] to-[#8c6d1f]";

  return (
    <div className="mb-8">
      {heroImage && (
        <div className="mb-6 overflow-hidden rounded-xl border border-[#9c7a2d]/60">
          <img
            src={heroImage}
            alt={heroAlt || title || section}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      <UniversalSearchBar defaultTarget={defaultTarget} />

      <div className="mt-6 text-center">
        <div
          className={`mb-3 bg-gradient-to-b ${sectionColor} bg-clip-text text-2xl font-black uppercase tracking-[0.18em] text-transparent md:text-3xl`}
        >
          {section}
        </div>

        {title && <GradientTitle>{title}</GradientTitle>}

        {(backHref || shareUrl || badge || children) && (
          <div className="mt-5">
            {(backHref || shareUrl) && (
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:w-auto">
                  {backHref && (
                    <a
                      href={backHref}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d4af37] bg-[#9c7a2d] px-3 py-2 text-sm font-bold text-black transition hover:bg-[#b99236] sm:w-auto"
                    >
                      ← Back
                    </a>
                  )}
                </div>

                <div className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
                  {shareUrl && shareType && title && (
                    <ShareButton
                      type={shareType}
                      title={title}
                      url={shareUrl}
                    />
                  )}
                </div>
              </div>
            )}

            {badge && <div className="mt-5 flex justify-center">{badge}</div>}

            {children && <div className="mt-5">{children}</div>}
          </div>
        )}
      </div>
    </div>
  );
}