import { revalidatePath } from "next/cache";

import {
  APPOINTMENT_STATUSES,
  APP_TIME_ZONE,
  DEFAULT_SERVICES,
  TIME_SLOTS,
} from "@/lib/constants";
import { buildWeeklyAvailability, getActiveWeekRange, isReservableDate } from "@/lib/schedule";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  AdminAppointmentUpdateInput,
  Appointment,
  AppointmentCreateInput,
  NailArea,
  Service,
  WeeklyAvailability,
} from "@/lib/types";

type AppointmentRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  appointment_date: string;
  time_slot: string;
  status: "booked" | "cancelled";
  nail_area: NailArea | null;
  created_at: string;
  updated_at: string;
};

type AppointmentServiceRow = {
  appointment_id: string;
  services:
    | {
        id: string;
        slug: string;
        name: string;
        accent_color: string;
      }
    | {
        id: string;
        slug: string;
        name: string;
        accent_color: string;
      }[]
    | null;
};

function normalizeService(row: {
  id: string;
  slug: string;
  name: string;
  accent_color: string;
}): Service {
  const normalizedName =
    row.slug === "unas"
      ? "Uñas"
      : row.slug === "pestanas"
        ? "Pestañas"
        : row.name;

  return {
    id: row.id,
    slug: row.slug,
    name: normalizedName,
    accentColor: row.accent_color,
  };
}

function normalizeAppointment(row: AppointmentRow, services: Service[]): Appointment {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    date: row.appointment_date,
    timeSlot: row.time_slot,
    status: row.status,
    nailArea: row.nail_area,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    services,
  };
}

function validateInput(input: AppointmentCreateInput, services: Service[]) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phoneNumber = input.phoneNumber.trim();
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const availableServiceIds = new Set(services.map((service) => service.id));
  const nailService = services.find((service) => service.slug === "unas");
  const includesNails = nailService ? input.serviceIds.includes(nailService.id) : false;

  if (!firstName || !lastName) {
    return "Ingresa nombre y apellido.";
  }

  if (phoneDigits.length < 8) {
    return "Ingresa un número de celular válido.";
  }

  if (!TIME_SLOTS.some((slot) => slot.value === input.timeSlot)) {
    return "El horario seleccionado no es valido.";
  }

  if (!input.serviceIds.length) {
    return "Selecciona al menos un servicio.";
  }

  if (input.serviceIds.some((serviceId) => !availableServiceIds.has(serviceId))) {
    return "Selecciona servicios válidos.";
  }

  if (includesNails && !input.nailArea) {
    return "Indica si las uñas serán para manos o pies.";
  }

  if (!isReservableDate(input.date, APP_TIME_ZONE)) {
    return "Solo puedes reservar de lunes a sabado dentro de la semana activa.";
  }

  return null;
}

async function fetchServicesFromDatabase() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return DEFAULT_SERVICES.map((service) => ({ ...service }));
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, slug, name, accent_color")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) {
    return DEFAULT_SERVICES.map((service) => ({ ...service }));
  }

  return data.map(normalizeService);
}

async function mapAppointmentServices(appointmentIds: string[]) {
  const supabase = await createSupabaseServerClient();

  if (!supabase || !appointmentIds.length) {
    return new Map<string, Service[]>();
  }

  const { data } = await supabase
    .from("appointment_services")
    .select("appointment_id, services(id, slug, name, accent_color)")
    .in("appointment_id", appointmentIds);

  const servicesMap = new Map<string, Service[]>();
  const rows = (data ?? []) as AppointmentServiceRow[];

  rows.forEach((row) => {
    const current = servicesMap.get(row.appointment_id) ?? [];
    const service = Array.isArray(row.services) ? row.services[0] : row.services;

    if (service) {
      current.push(normalizeService(service));
      servicesMap.set(row.appointment_id, current);
    }
  });

  return servicesMap;
}

export async function getServices() {
  return fetchServicesFromDatabase();
}

export async function getWeeklyAvailability(): Promise<WeeklyAvailability> {
  const { today, weekStart, weekEnd } = getActiveWeekRange(APP_TIME_ZONE);
  const supabase = await createSupabaseServerClient();
  const bookedMap = new Map<string, { appointmentId: string }>();

  if (supabase) {
    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, time_slot, status")
      .eq("status", APPOINTMENT_STATUSES.booked)
      .gte("appointment_date", weekStart)
      .lte("appointment_date", weekEnd);

    data?.forEach((row) => {
      bookedMap.set(`${row.appointment_date}:${row.time_slot}`, {
        appointmentId: row.id,
      });
    });
  }

  return buildWeeklyAvailability(weekStart, bookedMap, today);
}

export async function getAdminAppointments() {
  const { weekStart, weekEnd } = getActiveWeekRange(APP_TIME_ZONE);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, first_name, last_name, phone_number, appointment_date, time_slot, status, nail_area, created_at, updated_at",
    )
    .gte("appointment_date", weekStart)
    .lte("appointment_date", weekEnd)
    .order("appointment_date", { ascending: true })
    .order("time_slot", { ascending: true });

  if (error || !data) {
    return [];
  }

  const servicesMap = await mapAppointmentServices(data.map((row) => row.id));

  return data.map((row) => normalizeAppointment(row, servicesMap.get(row.id) ?? []));
}

export async function createAppointment(input: AppointmentCreateInput): Promise<ActionResult> {
  const services = await fetchServicesFromDatabase();
  const validationError = validateInput(input, services);

  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Configura Supabase para poder guardar reservas reales.",
    };
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone_number: input.phoneNumber.trim(),
      appointment_date: input.date,
      time_slot: input.timeSlot,
      status: APPOINTMENT_STATUSES.booked,
      nail_area: input.nailArea,
      week_start: getActiveWeekRange(APP_TIME_ZONE).weekStart,
    })
    .select("id")
    .single();

  if (error || !data) {
    const message =
      error?.code === "23505"
        ? "Ese horario ya fue reservado. Elige otro."
        : "No se pudo guardar la reserva.";
    return { ok: false, message };
  }

  const { error: serviceError } = await supabase
    .from("appointment_services")
    .insert(
      input.serviceIds.map((serviceId) => ({
        appointment_id: data.id,
        service_id: serviceId,
      })),
    );

  if (serviceError) {
    await supabase.from("appointments").delete().eq("id", data.id);
    return { ok: false, message: "No se pudieron guardar los servicios." };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, message: "Reserva creada con exito." };
}

export async function updateAppointment(
  appointmentId: string,
  input: AdminAppointmentUpdateInput,
): Promise<ActionResult> {
  const services = await fetchServicesFromDatabase();
  const validationError = validateInput(input, services);

  if (validationError) {
    return { ok: false, message: validationError };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Configura Supabase para editar reservas." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone_number: input.phoneNumber.trim(),
      appointment_date: input.date,
      time_slot: input.timeSlot,
      status: input.status,
      nail_area: input.nailArea,
      week_start: getActiveWeekRange(APP_TIME_ZONE).weekStart,
    })
    .eq("id", appointmentId);

  if (error) {
    const message =
      error.code === "23505"
        ? "El nuevo horario ya esta ocupado."
        : "No se pudo actualizar la cita.";
    return { ok: false, message };
  }

  await supabase.from("appointment_services").delete().eq("appointment_id", appointmentId);
  const { error: pivotError } = await supabase.from("appointment_services").insert(
    input.serviceIds.map((serviceId) => ({
      appointment_id: appointmentId,
      service_id: serviceId,
    })),
  );

  if (pivotError) {
    return { ok: false, message: "La cita se actualizo, pero fallo la lista de servicios." };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, message: "Cita actualizada." };
}

export async function cancelAppointment(appointmentId: string): Promise<ActionResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Configura Supabase para cancelar reservas." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: APPOINTMENT_STATUSES.cancelled })
    .eq("id", appointmentId);

  if (error) {
    return { ok: false, message: "No se pudo cancelar la cita." };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, message: "Cita cancelada y cupo liberado." };
}
