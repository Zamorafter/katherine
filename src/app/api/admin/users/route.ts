import { NextResponse } from "next/server";

import { requireAuthenticatedAdmin } from "@/lib/admin-auth";
import { createAdminUser } from "@/lib/admin-users";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const input = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const result = await createAdminUser({
    email: input.email ?? "",
    password: input.password ?? "",
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
