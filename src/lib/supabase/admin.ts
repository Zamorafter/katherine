import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const env = getSupabaseServiceEnv();

  if (!env.configured || !env.url || !env.serviceRoleKey) {
    return null;
  }

  adminClient = createClient<Database>(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
