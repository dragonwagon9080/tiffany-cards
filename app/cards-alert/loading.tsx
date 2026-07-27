import TiffanyLoadingScreen from "@/components/shared/TiffanyLoadingScreen";

export default function CardsAlertLoading() {
  return (
    <TiffanyLoadingScreen
      message="Loading Cards Alert"
      detail="Retrieving the latest Cards Alert database records."
    />
  );
}