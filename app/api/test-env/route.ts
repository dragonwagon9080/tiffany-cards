import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    TNCE_APPS_SCRIPT_URL: process.env.TNCE_APPS_SCRIPT_URL ?? null,
    RPA_TRACKER_API_URL: process.env.RPA_TRACKER_API_URL ?? null,
    CARDS_ALERT_API_URL: process.env.CARDS_ALERT_API_URL ?? null,
  });
}