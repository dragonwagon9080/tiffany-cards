"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  label: string;
  url: string;
};

type CardSet = {
  slug: string;
  name: string;
  active?: string;
};

export default function SiteHeader({
  settings,
  navigation,
  cardSets = [],
}: {
  settings: any;
  navigation: NavItem[];
  theme: any;
  cardSets?: CardSet[];
}) {
  const pathname = usePathname();
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);

  return (
    <header className="bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 md:flex-row md:justify-between md:px-6">
        <a href="/" className="flex items-center gap-3">
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt="Tiffany Cards Logo"
              className="h-8 w-auto md:h-14"
            />
          )}

          <span
            className="bg-gradient-to-b from-[#fff4b5] via-[#d4af37] to-[#8b6b00] bg-clip-text text-base font-extrabold tracking-wide text-transparent md:text-3xl"
            style={{
              textShadow:
                "0 1px 1px rgba(255,255,255,.25), 0 0 10px rgba(212,175,55,.25)",
            }}
          >
            {settings?.site_name || "Tiffany Cards"}
          </span>
        </a>

        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold md:gap-5 md:text-sm lg:gap-8 lg:text-base">
          {navigation.map((item) => {
            const isActive =
              item.url === "/"
                ? pathname === "/"
                : pathname === item.url || pathname.startsWith(`${item.url}/`);

            const isCardSets = item.url === "/card-sets";
            const dropdownItems = isCardSets ? cardSets : [];

            return (
              <div key={item.url} className="group relative">
                <a
                  href={item.url}
                  className={`
                    relative
                    transition-all
                    duration-300
                    after:absolute
                    after:left-0
                    after:-bottom-1
                    after:h-[2px]
                    after:bg-[#d4af37]
                    after:transition-all
                    after:duration-300
                    ${
                      isActive
                        ? "text-[#d4af37] after:w-full"
                        : "text-white hover:text-[#d4af37] after:w-0 hover:after:w-full"
                    }
                  `}
                  onClick={(e) => {
                    if (isCardSets && dropdownItems.length > 0) {
                      if (window.innerWidth < 768) {
                        e.preventDefault();
                        setOpenMobileMenu(
                          openMobileMenu === item.url ? null : item.url
                        );
                      }
                    }
                  }}
                >
                  {item.label}
                </a>

                {isCardSets && dropdownItems.length > 0 && (
                  <>
                    <div className="absolute left-1/2 top-full z-50 hidden w-64 -translate-x-1/2 pt-4 group-hover:block">
                      <div className="rounded-lg border border-[#d4af37]/60 bg-black p-3 shadow-2xl">
                        {dropdownItems.map((set) => (
                          <a
                            key={set.slug}
                            href={`/card-sets/${set.slug}`}
                            className="block rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d4af37] hover:text-black"
                          >
                            {set.name}
                          </a>
                        ))}
                      </div>
                    </div>

                    {openMobileMenu === item.url && (
                      <div className="mt-3 w-full rounded-lg border border-[#d4af37]/50 bg-[#111] p-3 md:hidden">
                        {dropdownItems.map((set) => (
                          <a
                            key={set.slug}
                            href={`/card-sets/${set.slug}`}
                            className="block rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d4af37] hover:text-black"
                          >
                            {set.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}