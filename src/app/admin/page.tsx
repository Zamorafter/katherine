import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminUsers } from "@/lib/admin-users";
import { getAdminAppointments, getServices } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/admin/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [appointments, services, adminUsers] = await Promise.all([
    getAdminAppointments(),
    getServices(),
    getAdminUsers(),
  ]);

  return (
    <AdminDashboard
      adminUsers={adminUsers}
      currentAdminEmail={user.email ?? ""}
      initialAppointments={appointments}
      key={appointments.map((appointment) => `${appointment.id}-${appointment.updatedAt}`).join("|")}
      services={services}
    />
  );
}
