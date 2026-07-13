import type { Metadata } from "next";

import TNCEDashboard from "@/components/tnce-admin/TNCEDashboard";

export const metadata: Metadata = {
  title: "TNCE Admin | Tiffany Cards",
  description:
    "Private administration dashboard for reviewing TiffanyCards Network Contribution Engine submissions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TNCEAdminPage() {
  return <TNCEDashboard />;
}