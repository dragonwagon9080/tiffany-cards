import TiffanyLoadingScreen from "@/components/shared/TiffanyLoadingScreen";

export default function RPACardLoading() {
  return (
    <TiffanyLoadingScreen
      message="Loading Card"
      detail="Retrieving the latest RPA Tracker card record."
    />
  );
}