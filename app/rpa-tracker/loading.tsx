import TiffanyLoadingScreen from "@/components/shared/TiffanyLoadingScreen";

export default function RPATrackerLoading() {
  return (
    <TiffanyLoadingScreen
      message="Loading RPA Tracker"
      detail="Retrieving the latest registry information."
    />
  );
}