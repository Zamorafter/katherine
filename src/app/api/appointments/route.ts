import { NextResponse } from "next/server";

import { createAppointment } from "@/lib/booking";
import type { AppointmentCreateInput } from "@/lib/types";

export async function POST(request: Request) {
  const input = (await request.json()) as AppointmentCreateInput;
  const result = await createAppointment(input);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
