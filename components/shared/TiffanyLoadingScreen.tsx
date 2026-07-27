type Props = {
  message?: string;
  detail?: string;
  fullScreen?: boolean;
};

const TIFFANY_CARDS_LOGO =
  "https://storage.googleapis.com/altered-card-database/2026-06-19_230015_2026_Tiffany_Cards_logo_TCE4395C68_front.png";

export default function TiffanyLoadingScreen({
  message = "Loading",
  fullScreen = true,
}: Props) {
  return (
    <div
      data-tiffany-loading
      role="status"
      aria-label={message}
      aria-live="polite"
      aria-busy="true"
      className={
        fullScreen
          ? "fixed inset-0 z-[9999] bg-black/55 backdrop-blur-[1px]"
          : "relative min-h-52 w-full bg-black"
      }
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <div className="text-center text-lg font-black text-white">
          {message}...
        </div>

        <div className="tiffany-roll-area">
          <img
            src={TIFFANY_CARDS_LOGO}
            alt=""
            className="tiffany-rolling-logo"
          />
        </div>
      </div>
    </div>
  );
}