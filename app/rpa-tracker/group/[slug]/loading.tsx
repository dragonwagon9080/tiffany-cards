import TiffanyLoadingScreen from "@/components/shared/TiffanyLoadingScreen";

export default function RPAGroupLoading() {
  return (
    <TiffanyLoadingScreen
      message="Loading Registry"
      detail="Retrieving the latest RPA Tracker registry."
    />
  );
}