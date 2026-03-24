import { AdminLoginForm } from "@/components/admin-login-form";
import { getSupabasePublicEnv } from "@/lib/env";

export default function AdminLoginPage() {
  const env = getSupabasePublicEnv();

  return <AdminLoginForm configured={env.configured} />;
}
