import TiffanyLoadingScreen from "@/components/shared/TiffanyLoadingScreen";

export default function CardsAlertCardLoading() {
  return (
    <TiffanyLoadingScreen
      message="Loading Card"
      detail="Retrieving the latest Cards Alert record."
    />
  );
}