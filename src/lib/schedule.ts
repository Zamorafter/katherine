import { APP_TIME_ZONE, TIME_SLOTS } from "@/lib/constants";
import type { AvailabilityDay, WeeklyAvailability } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateParts(date: Date, timeZone = APP_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: map.weekday,
  };
}

export function getTodayInTimeZone(timeZone = APP_TIME_ZONE) {
  const parts = toDateParts(new Date(), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function parseDateOnly(dateString: string) {
  return new Date(`${dateString}T12:00:00.000Z`);
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number) {
  const date = parseDateOnly(dateString);
  return formatDateOnly(new Date(date.getTime() + days * DAY_MS));
}

export function getWeekdayIndex(dateString: string) {
  return parseDateOnly(dateString).getUTCDay();
}

export function getActiveWeekStart(
  referenceDate = getTodayInTimeZone(APP_TIME_ZONE),
) {
  const weekday = getWeekdayIndex(referenceDate);

  if (weekday === 0) {
    return addDays(referenceDate, 1);
  }

  return addDays(referenceDate, -(weekday - 1));
}

export function getActiveWeekRange(timeZone = APP_TIME_ZONE) {
  const today = getTodayInTimeZone(timeZone);
  const weekStart = getActiveWeekStart(today);
  const weekEnd = addDays(weekStart, 5);

  return { today, weekStart, weekEnd };
}

export function isReservableDate(dateString: string, timeZone = APP_TIME_ZONE) {
  const { weekStart, weekEnd } = getActiveWeekRange(timeZone);
  const weekday = getWeekdayIndex(dateString);
  return dateString >= weekStart && dateString <= weekEnd && weekday >= 1 && weekday <= 6;
}

export function buildWeekDays(
  weekStart: string,
  bookedMap: Map<string, { appointmentId: string }>,
  today: string,
) {
  return Array.from({ length: 6 }, (_, index): AvailabilityDay => {
    const date = addDays(weekStart, index);
    const dateValue = parseDateOnly(date);

    const shortLabel = new Intl.DateTimeFormat("es-BO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(dateValue);

    const fullLabel = new Intl.DateTimeFormat("es-BO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(dateValue);

    return {
      date,
      shortLabel,
      fullLabel,
      isToday: date === today,
      slots: TIME_SLOTS.map((slot) => {
        const key = `${date}:${slot.value}`;
        const booked = bookedMap.get(key);

        return {
          timeSlot: slot.value,
          label: slot.label,
          status: booked ? "booked" : "available",
          appointmentId: booked?.appointmentId,
        };
      }),
    };
  });
}

export function buildWeeklyAvailability(
  weekStart: string,
  bookedMap: Map<string, { appointmentId: string }>,
  today: string,
): WeeklyAvailability {
  const weekEnd = addDays(weekStart, 5);
  const title = new Intl.DateTimeFormat("es-BO", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(weekStart));
  const endTitle = new Intl.DateTimeFormat("es-BO", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(weekEnd));

  return {
    weekStart,
    weekEnd,
    title: "Agenda semanal",
    subtitle: `${title} al ${endTitle}`,
    days: buildWeekDays(weekStart, bookedMap, today),
  };
}
