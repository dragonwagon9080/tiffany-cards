type GradientTitleProps = {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center";
};

export default function GradientTitle({
  children,
  className = "",
  align = "center",
}: GradientTitleProps) {
  const alignment = align === "left" ? "text-left" : "text-center";

  return (
    <h1
      className={[
        "bg-gradient-to-b from-[#fff6c4] via-[#d4af37] to-[#8c6d1f]",
        "bg-clip-text text-transparent",
        "text-4xl font-black uppercase tracking-wide md:text-6xl",
        alignment,
        className,
      ].join(" ")}
    >
      {children}
    </h1>
  );
}