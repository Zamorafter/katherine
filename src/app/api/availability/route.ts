import { NextResponse } from "next/server";

import { getWeeklyAvailability } from "@/lib/booking";

export async function GET() {
  const availability = await getWeeklyAvailability();
  return NextResponse.json(availability);
}
