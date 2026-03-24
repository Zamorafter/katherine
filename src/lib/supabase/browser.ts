"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (client) {
    return client;
  }

  const env = getSupabasePublicEnv();

  if (!env.configured || !env.url || !env.anonKey) {
    return null;
  }

  client = createBrowserClient<Database>(env.url, env.anonKey);
  return client;
}
