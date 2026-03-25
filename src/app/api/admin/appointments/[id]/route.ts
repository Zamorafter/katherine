import { NextResponse } from "next/server";

import { requireAuthenticatedAdmin } from "@/lib/admin-auth";
import { cancelAppointment, updateAppointment } from "@/lib/booking";
import type { AdminAppointmentUpdateInput } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const input = (await request.json()) as AdminAppointmentUpdateInput;
  const result = await updateAppointment(id, input);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthenticatedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const result = await cancelAppointment(id);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
