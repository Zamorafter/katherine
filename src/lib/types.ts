export type Service = {
  id: string;
  slug: string;
  name: string;
  accentColor: string;
};

export type AppointmentStatus = "booked" | "cancelled";

export type AppointmentCreateInput = {
  firstName: string;
  lastName: string;
  date: string;
  timeSlot: string;
  serviceIds: string[];
};

export type AdminAppointmentUpdateInput = AppointmentCreateInput & {
  status: AppointmentStatus;
};

export type Appointment = {
  id: string;
  firstName: string;
  lastName: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  services: Service[];
};

export type AvailabilitySlot = {
  timeSlot: string;
  label: string;
  status: "available" | "booked";
  appointmentId?: string;
};

export type AvailabilityDay = {
  date: string;
  shortLabel: string;
  fullLabel: string;
  isToday: boolean;
  slots: AvailabilitySlot[];
};

export type WeeklyAvailability = {
  weekStart: string;
  weekEnd: string;
  title: string;
  subtitle: string;
  days: AvailabilityDay[];
};

export type ActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
