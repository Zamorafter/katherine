import { BookingPage } from "@/components/booking-page";
import { getServices, getWeeklyAvailability } from "@/lib/booking";
import { getSupabasePublicEnv } from "@/lib/env";

export default async function Home() {
  const [availability, services] = await Promise.all([
    getWeeklyAvailability(),
    getServices(),
  ]);
  const env = getSupabasePublicEnv();

  return (
    <BookingPage
      initialAvailability={availability}
      isSupabaseConfigured={env.configured}
      services={services}
    />
  );
}
