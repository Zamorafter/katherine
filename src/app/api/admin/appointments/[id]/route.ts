import { NextResponse } from "next/server";

import { cancelAppointment, updateAppointment } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminAppointmentUpdateInput } from "@/lib/types";

async function requireAuthenticatedAdmin() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Falta configurar Supabase." },
        { status: 500 },
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "No autorizado." },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const };
}

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
