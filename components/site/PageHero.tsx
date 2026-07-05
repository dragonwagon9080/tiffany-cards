/* =========================================================
   PAGE HERO
   Reusable CMS-driven hero for TiffanyCards.com pages

   Supports:
   - Gold title font
   - Subtitle
   - Hero background image
   - Desktop border image
   - Mobile border image
   ========================================================= */

type PageHeroProps = {
  title?: string;
  subtitle?: string;
  heroImage?: string;
  desktopBorder?: string;
  mobileBorder?: string;
  fallbackTitle?: string;
};

export default function PageHero({
  title,
  subtitle,
  heroImage,
  desktopBorder,
  mobileBorder,
  fallbackTitle = "Tiffany Cards",
}: PageHeroProps) {
  return (
    <section className="bg-black px-4 py-4">
      <div className="relative w-full">
        <div className="relative">
          {/* MOBILE BORDER */}
          {mobileBorder && (
            <img
              src={mobileBorder}
              alt=""
              className="pointer-events-none absolute left-0 top-1 z-30 block h-full w-full object-fill md:hidden"
            />
          )}

          {/* DESKTOP BORDER */}
          {desktopBorder && (
            <img
              src={desktopBorder}
              alt=""
              className="pointer-events-none absolute left-0 -top-4 z-30 hidden h-[104%] w-full object-fill md:block"
            />
          )}

          {/* HERO IMAGE */}
          <div
            className="relative z-10 flex min-h-[280px] items-center justify-center overflow-hidden bg-cover bg-center text-center shadow-2xl md:min-h-[340px] lg:min-h-[375px]"
            style={{
              backgroundImage: heroImage
                ? `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${heroImage})`
                : "linear-gradient(135deg, #050505, #2a2112)",
            }}
          >
            <div className="relative z-20 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-5 py-8 text-center md:px-10 md:py-0">
              <h1 className="gold-title text-2xl font-black uppercase leading-tight tracking-[0.04em] sm:text-3xl md:text-5xl lg:text-6xl">
                {title || fallbackTitle}
              </h1>

              {subtitle && (
                <p
                  className="mt-3 text-sm uppercase leading-relaxed tracking-[0.12em] text-white sm:text-base md:mt-5 md:text-2xl md:tracking-[0.22em]"
                  style={{
                    fontFamily:
                      "var(--font-cinzel), Georgia, 'Times New Roman', serif",
                    fontWeight: 700,
                    textShadow: "0 3px 8px rgba(0,0,0,.85)",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}