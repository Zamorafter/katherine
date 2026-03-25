import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, AdminUser } from "@/lib/types";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers();

  if (error) {
    return [];
  }

  return users
    .filter((user) => Boolean(user.email))
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
    }))
    .sort((left, right) => left.email.localeCompare(right.email, "es"));
}

export async function createAdminUser(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Configura Supabase para administrar usuarias." };
  }

  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  if (!email) {
    return { ok: false, message: "Ingresa un correo para la nueva administradora." };
  }

  if (password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Administradora creada con éxito." };
}
