"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import styles from "@/components/booking-page.module.css";
import { BOOKING_CHANNEL, SOCIAL_LINKS, TIME_SLOTS } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Service, WeeklyAvailability } from "@/lib/types";

type Props = {
  initialAvailability: WeeklyAvailability;
  services: Service[];
  isSupabaseConfigured: boolean;
};

type FormState = {
  firstName: string;
  lastName: string;
  date: string;
  timeSlot: string;
  serviceIds: string[];
};

const EMPTY_MESSAGE = "Selecciona un horario disponible para empezar.";

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M19.05 4.94A9.93 9.93 0 0 0 12 2a9.98 9.98 0 0 0-8.74 14.8L2 22l5.33-1.22A10 10 0 1 0 19.05 4.94Zm-7.05 15.38a8.28 8.28 0 0 1-4.22-1.15l-.3-.18-3.16.73.75-3.08-.2-.32a8.31 8.31 0 1 1 7.13 4Zm4.56-6.22c-.25-.12-1.49-.73-1.72-.82-.23-.08-.4-.12-.57.13-.16.24-.65.82-.79.99-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.24-.74-.65-1.24-1.45-1.39-1.7-.15-.24-.01-.37.11-.49.11-.11.25-.29.37-.43.12-.15.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.57-1.36-.78-1.87-.2-.48-.41-.41-.57-.42h-.49c-.16 0-.43.06-.66.31-.22.24-.86.84-.86 2.06s.88 2.39 1 2.55c.12.16 1.73 2.64 4.19 3.71.58.25 1.04.4 1.39.51.58.18 1.11.15 1.53.09.47-.07 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.11-.22-.18-.47-.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.9 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M14.55 2h2.33a4.8 4.8 0 0 0 1.44 3.09A4.83 4.83 0 0 0 21 6.41v2.36a7.18 7.18 0 0 1-4.1-1.28v6.13a6.12 6.12 0 1 1-6.12-6.12c.31 0 .63.03.93.08v2.4a3.7 3.7 0 0 0-.93-.12 3.76 3.76 0 1 0 3.77 3.76V2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookingPage({
  initialAvailability,
  services,
  isSupabaseConfigured,
}: Props) {
  const [availability, setAvailability] = useState(initialAvailability);
  const [message, setMessage] = useState(EMPTY_MESSAGE);
  const [formState, setFormState] = useState<FormState>({
    firstName: "",
    lastName: "",
    date: "",
    timeSlot: "",
    serviceIds: [],
  });
  const [isPending, startTransition] = useTransition();

  const refreshAvailability = useCallback(async () => {
    const response = await fetch("/api/availability", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const nextAvailability = (await response.json()) as WeeklyAvailability;
    setAvailability(nextAvailability);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(BOOKING_CHANNEL)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          void refreshAvailability();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshAvailability]);

  const selectedDay = useMemo(
    () => availability.days.find((day) => day.date === formState.date),
    [availability.days, formState.date],
  );

  function selectSlot(date: string, timeSlot: string) {
    setFormState((current) => ({ ...current, date, timeSlot }));
    setMessage("Completa tu nombre, apellido y servicios para confirmar.");
  }

  function toggleService(serviceId: string) {
    setFormState((current) => {
      const exists = current.serviceIds.includes(serviceId);
      return {
        ...current,
        serviceIds: exists
          ? current.serviceIds.filter((item) => item !== serviceId)
          : [...current.serviceIds, serviceId],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Guardando tu reserva...");

    startTransition(async () => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const result = (await response.json()) as { ok: boolean; message: string };
      setMessage(result.message);

      if (result.ok) {
        setFormState({
          firstName: "",
          lastName: "",
          date: "",
          timeSlot: "",
          serviceIds: [],
        });
        await refreshAvailability();
      }
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <article className={styles.heroCard}>
            <div className={styles.logoBadge}>
              <Image
                alt="Studio Seven K"
                className={styles.logoImage}
                height={92}
                priority
                src="/studio-seven-k-logo.jpg"
                width={92}
              />
            </div>
            <span className={styles.eyebrow}>Beauty booking studio</span>
            <h1 className={styles.title}>Reserva tu espacio para sentirte divina.</h1>
            <p className={styles.lead}>
              Agenda sin crear cuenta, elige tus servicios favoritos y revisa la
              disponibilidad real de la semana. Los espacios ocupados se marcan
              con un corazon para que la siguiente clienta vea el horario apartado.
            </p>
            <div className={styles.chipRow}>
              <span className={styles.chip}>Lunes a sabado</span>
              <span className={styles.chip}>4 horarios por dia</span>
              <span className={styles.chip}>Actualizacion en tiempo real</span>
            </div>
          </article>

          <aside className={styles.sideCard}>
            <div>
              <p className={styles.kicker}>{availability.title}</p>
              <p className={styles.weekLabel}>{availability.subtitle}</p>
            </div>

            <p className={styles.smallText}>
              Los domingos la agenda publica se limpia y empieza una nueva semana
              vacia automaticamente.
            </p>

            <div className={styles.legend}>
              <span className={styles.legendTag}>
                <span className={styles.heart}>{"\u2661"}</span>
                Disponible
              </span>
              <span className={styles.legendTag}>
                <span className={styles.heart}>{"\u2665"}</span>
                Apartado
              </span>
            </div>

            <a
              className={styles.whatsAppButton}
              href={SOCIAL_LINKS.whatsapp}
              rel="noreferrer"
              target="_blank"
            >
              <span className={styles.socialIcon}>
                <WhatsAppIcon />
              </span>
              Hablar por WhatsApp
            </a>

            <div className={styles.socialRow}>
              <a
                className={styles.socialLink}
                href={SOCIAL_LINKS.instagram}
                rel="noreferrer"
                target="_blank"
              >
                <span className={styles.socialIcon}>
                  <InstagramIcon />
                </span>
                Instagram
              </a>
              <a
                className={styles.socialLink}
                href={SOCIAL_LINKS.tiktok}
                rel="noreferrer"
                target="_blank"
              >
                <span className={styles.socialIcon}>
                  <TikTokIcon />
                </span>
                TikTok
              </a>
            </div>
          </aside>
        </section>

        <section className={styles.agendaHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Horarios de esta semana</h2>
            <p className={styles.sectionLead}>
              Solo hay un cupo por horario. Cuando una cita entra, ese bloque se
              pinta como reservado y se sincroniza para todas las personas.
            </p>
          </div>
        </section>

        <section className={styles.agendaGrid}>
          {availability.days.map((day) => (
            <article className={styles.agendaCard} key={day.date}>
              <div>
                {day.isToday ? <span className={styles.todayPill}>Hoy</span> : null}
                <h3 className={styles.dayTitle}>{day.fullLabel}</h3>
              </div>

              <div className={styles.slotList}>
                {day.slots.map((slot) => {
                  const isBooked = slot.status === "booked";

                  return (
                    <button
                      key={`${day.date}-${slot.timeSlot}`}
                      className={`${styles.slotButton} ${isBooked ? styles.slotBooked : ""}`}
                      disabled={isBooked}
                      onClick={() => selectSlot(day.date, slot.timeSlot)}
                      type="button"
                    >
                      <div className={styles.slotTime}>{slot.label}</div>
                      <div className={styles.slotMeta}>
                        <span>{isBooked ? "Horario apartado" : "Disponible"}</span>
                        <span className={styles.heart}>
                          {isBooked ? "\u2665" : "\u2661"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.panelCard}>
          <div>
            <p className={styles.kicker}>Reservar cita</p>
            <h2 className={styles.sectionTitle}>Completa tu reserva</h2>
            <p className={styles.sectionLead}>
              No necesitas registro previo. Solo agrega tu nombre, apellido y los
              servicios que deseas para asegurar tu espacio.
            </p>
          </div>

          {!isSupabaseConfigured ? (
            <div className={styles.notice}>
              La interfaz ya esta lista, pero faltan las variables de Supabase para
              guardar reservas reales.
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Nombre</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  placeholder="Katherine"
                  required
                  value={formState.firstName}
                />
              </label>

              <label className={styles.field}>
                <span>Apellido</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  placeholder="Perez"
                  required
                  value={formState.lastName}
                />
              </label>

              <label className={styles.field}>
                <span>Dia elegido</span>
                <select
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  required
                  value={formState.date}
                >
                  <option value="">Selecciona un dia</option>
                  {availability.days.map((day) => (
                    <option key={day.date} value={day.date}>
                      {day.fullLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Horario</span>
                <select
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      timeSlot: event.target.value,
                    }))
                  }
                  required
                  value={formState.timeSlot}
                >
                  <option value="">Selecciona un horario</option>
                  {(selectedDay?.slots ?? availability.days[0]?.slots ?? []).map((slot) => (
                    <option
                      disabled={slot.status === "booked"}
                      key={slot.timeSlot}
                      value={slot.timeSlot}
                    >
                      {slot.label}
                      {slot.status === "booked" ? " - ocupado" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className={styles.servicesField}>
                <span>Servicios</span>
                <div className={styles.servicesGrid}>
                  {services.map((service) => (
                    <label className={styles.servicePill} key={service.id}>
                      <input
                        checked={formState.serviceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        type="checkbox"
                      />
                      <span style={{ background: `${service.accentColor}1f` }}>
                        {service.name}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className={styles.actions}>
              <button className={styles.reserveButton} disabled={isPending} type="submit">
                {isPending ? "Guardando..." : "Confirmar reserva"}
              </button>
              <span className={styles.statusMessage}>{message}</span>
            </div>
          </form>
        </section>

        <section className={styles.notice}>
          <strong>Horarios fijos:</strong> {TIME_SLOTS.map((slot) => slot.label).join(" | ")}
        </section>
      </div>
    </div>
  );
}
