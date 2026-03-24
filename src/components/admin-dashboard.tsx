"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/admin-dashboard.module.css";
import { BOOKING_CHANNEL, TIME_SLOTS } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Appointment, Service } from "@/lib/types";

type Props = {
  initialAppointments: Appointment[];
  services: Service[];
};

type EditableAppointment = {
  id: string;
  firstName: string;
  lastName: string;
  date: string;
  timeSlot: string;
  status: "booked" | "cancelled";
  serviceIds: string[];
};

function toEditable(appointment: Appointment): EditableAppointment {
  return {
    id: appointment.id,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    date: appointment.date,
    timeSlot: appointment.timeSlot,
    status: appointment.status,
    serviceIds: appointment.services.map((service) => service.id),
  };
}

export function AdminDashboard({ initialAppointments, services }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<EditableAppointment | null>(
    initialAppointments[0] ? toEditable(initialAppointments[0]) : null,
  );
  const [message, setMessage] = useState("Revisa y actualiza la agenda desde aqui.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`${BOOKING_CHANNEL}-admin`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const stats = useMemo(() => {
    const booked = initialAppointments.filter((item) => item.status === "booked").length;
    const cancelled = initialAppointments.filter((item) => item.status === "cancelled").length;
    return {
      total: initialAppointments.length,
      booked,
      cancelled,
    };
  }, [initialAppointments]);

  function openEditor(appointment: Appointment) {
    setSelected(toEditable(appointment));
    setMessage(`Editando la cita de ${appointment.firstName} ${appointment.lastName}.`);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    setMessage("Guardando cambios...");

    startTransition(async () => {
      const response = await fetch(`/api/admin/appointments/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const result = (await response.json()) as { ok: boolean; message: string };
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  async function handleCancel() {
    if (!selected) {
      return;
    }

    setMessage("Cancelando cita...");

    startTransition(async () => {
      const response = await fetch(`/api/admin/appointments/${selected.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok: boolean; message: string };
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Panel administradora</p>
            <h1 className={styles.title}>Tu agenda viva de la semana</h1>
            <p className={styles.lead}>
              Cada cambio de la pagina publica aparece aqui para que puedas hacer
              seguimiento, reorganizar horarios y liberar cupos cuando sea necesario.
            </p>
          </div>
          <button className={styles.logoutButton} onClick={logout} type="button">
            Cerrar sesion
          </button>
        </header>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Reservas de la semana</p>
            <p className={styles.summaryValue}>{stats.total}</p>
          </article>
          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Citas activas</p>
            <p className={styles.summaryValue}>{stats.booked}</p>
          </article>
          <article className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Citas canceladas</p>
            <p className={styles.summaryValue}>{stats.cancelled}</p>
          </article>
        </section>

        <section className={styles.content}>
          <article className={styles.tableCard}>
            <h2 className={styles.editorTitle}>Reservaciones</h2>
            <p className={styles.editorLead}>
              Haz clic en una cita para editarla o cancelarla.
            </p>

            <div className={styles.list}>
              {initialAppointments.length ? (
                initialAppointments.map((appointment) => (
                  <article className={styles.appointmentItem} key={appointment.id}>
                    <div className={styles.appointmentTop}>
                      <div>
                        <p className={styles.name}>
                          {appointment.firstName} {appointment.lastName}
                        </p>
                        <p className={styles.meta}>
                          {appointment.date} | {appointment.timeSlot}
                        </p>
                      </div>
                      <span className={styles.statusTag}>{appointment.status}</span>
                    </div>

                    <div className={styles.serviceRow}>
                      {appointment.services.map((service) => (
                        <span
                          className={styles.serviceTag}
                          key={service.id}
                          style={{ background: `${service.accentColor}28` }}
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>

                    <div className={styles.appointmentBottom}>
                      <span className={styles.statusLine}>
                        Actualizada {new Date(appointment.updatedAt).toLocaleString("es-BO")}
                      </span>
                      <button
                        className={styles.selectButton}
                        onClick={() => openEditor(appointment)}
                        type="button"
                      >
                        Editar cita
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className={styles.emptyCard}>Aun no hay citas para esta semana.</div>
              )}
            </div>
          </article>

          <aside className={styles.editorCard}>
            <h2 className={styles.editorTitle}>Editor de cita</h2>
            <p className={styles.editorLead}>
              Puedes mover fecha, horario, servicios o marcar la reserva como cancelada.
            </p>

            {selected ? (
              <form className={styles.form} onSubmit={handleSave}>
                <label className={styles.field}>
                  Nombre
                  <input
                    onChange={(event) =>
                      setSelected((current) =>
                        current ? { ...current, firstName: event.target.value } : current,
                      )
                    }
                    value={selected.firstName}
                  />
                </label>

                <label className={styles.field}>
                  Apellido
                  <input
                    onChange={(event) =>
                      setSelected((current) =>
                        current ? { ...current, lastName: event.target.value } : current,
                      )
                    }
                    value={selected.lastName}
                  />
                </label>

                <label className={styles.field}>
                  Fecha
                  <input
                    onChange={(event) =>
                      setSelected((current) =>
                        current ? { ...current, date: event.target.value } : current,
                      )
                    }
                    type="date"
                    value={selected.date}
                  />
                </label>

                <label className={styles.field}>
                  Horario
                  <select
                    onChange={(event) =>
                      setSelected((current) =>
                        current ? { ...current, timeSlot: event.target.value } : current,
                      )
                    }
                    value={selected.timeSlot}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  Estado
                  <select
                    onChange={(event) =>
                      setSelected((current) =>
                        current
                          ? {
                              ...current,
                              status: event.target.value as "booked" | "cancelled",
                            }
                          : current,
                      )
                    }
                    value={selected.status}
                  >
                    <option value="booked">booked</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </label>

                <div className={styles.field}>
                  Servicios
                  <div className={styles.servicesGrid}>
                    {services.map((service) => (
                      <label className={styles.serviceOption} key={service.id}>
                        <input
                          checked={selected.serviceIds.includes(service.id)}
                          onChange={() =>
                            setSelected((current) => {
                              if (!current) {
                                return current;
                              }

                              const exists = current.serviceIds.includes(service.id);
                              return {
                                ...current,
                                serviceIds: exists
                                  ? current.serviceIds.filter((id) => id !== service.id)
                                  : [...current.serviceIds, service.id],
                              };
                            })
                          }
                          type="checkbox"
                        />
                        <span style={{ background: `${service.accentColor}1f` }}>
                          {service.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.editorActions}>
                  <button className={styles.saveButton} disabled={isPending} type="submit">
                    Guardar cambios
                  </button>
                  <button
                    className={styles.dangerButton}
                    disabled={isPending}
                    onClick={handleCancel}
                    type="button"
                  >
                    Cancelar cita
                  </button>
                </div>
                <p className={styles.message}>{message}</p>
              </form>
            ) : (
              <div className={styles.emptyCard}>Selecciona una cita para editarla.</div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
