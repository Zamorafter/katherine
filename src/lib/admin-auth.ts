import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedAdmin() {
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

  return { ok: true as const, user };
}
