/* =========================================================
   TYPES
   ========================================================= */

type SocialItem = {
  label: string;
  url: string;
  icon_url?: string;
};

/* =========================================================
   SITE FOOTER
   ========================================================= */

export default function SiteFooter({
  settings,
  socials,
}: {
  settings: any;
  socials: SocialItem[];
}){
  const footerLogo =
    settings?.footer_logo_url ||
    settings?.logo_url ||
    "https://storage.googleapis.com/altered-card-database/Tiffany%20Cards/Tiffany-Cards-Guide-Logo.png";

  return (
    <footer className="bg-black px-6 py-8 text-center text-white">
      {/* LOGO ROW */}
      <a href="/" className="mb-5 inline-flex items-center justify-center">
        <img
          src={footerLogo}
          alt="Tiffany Cards"
          className="h-16 w-auto object-contain md:h-20"
        />
      </a>

      {/* PAGE LINKS ROW */}
      <nav className="mb-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold md:text-base">
        <FooterTextLink href="/about">About</FooterTextLink>
        <FooterTextLink href="/privacy-policy">Privacy Policy</FooterTextLink>
        <FooterTextLink href="/contact">Contact</FooterTextLink>
        <FooterTextLink href="/legal-disclaimer">Disclaimer</FooterTextLink>
      </nav>

      {/* SOCIAL LOGO LINKS ROW */}
      {socials?.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-4">
          {socials.map((item, index) => {
            const href = item.url || "#";
            const isEmail = href.startsWith("mailto:");

            return (
              <a
                key={`${item.label}-${index}`}
                href={href}
                target={isEmail ? "_self" : "_blank"}
                rel={isEmail ? undefined : "noopener noreferrer"}
                title={item.label}
                className="group inline-flex flex-col items-center gap-1"
              >
                {item.icon_url ? (
                  <img
                    src={item.icon_url}
                    alt={item.label}
                    className="h-8 w-8 object-contain transition duration-300 group-hover:scale-110"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white transition group-hover:text-[#d4af37]">
                    {item.label}
                  </span>
                )}

                <span className="h-[2px] w-0 bg-[#d4af37] transition-all duration-300 group-hover:w-full" />
              </a>
            );
          })}
        </div>
      )}

      {/* COPYRIGHT ROW */}
      <p className="text-xs text-zinc-400 md:text-sm">
        {settings?.footer_text || "© 2026 Tiffany Cards. All Rights Reserved."}
      </p>
    </footer>
  );
}

/* =========================================================
   FOOTER TEXT LINK
   ========================================================= */

function FooterTextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="relative text-white transition duration-300 hover:text-[#d4af37] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-[#d4af37] after:transition-all after:duration-300 hover:after:w-full"
    >
      {children}
    </a>
  );
}