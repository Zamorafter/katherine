"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/admin-dashboard.module.css";
import { BOOKING_CHANNEL, STATUS_LABELS, TIME_SLOTS } from "@/lib/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminUser, Appointment, NailArea, Service } from "@/lib/types";

type Props = {
  adminUsers: AdminUser[];
  currentAdminEmail: string;
  initialAppointments: Appointment[];
  services: Service[];
};

type EditableAppointment = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  date: string;
  timeSlot: string;
  status: "booked" | "cancelled";
  serviceIds: string[];
  nailArea: NailArea | null;
};

function toEditable(appointment: Appointment): EditableAppointment {
  return {
    id: appointment.id,
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    phoneNumber: appointment.phoneNumber,
    date: appointment.date,
    timeSlot: appointment.timeSlot,
    status: appointment.status,
    serviceIds: appointment.services.map((service) => service.id),
    nailArea: appointment.nailArea,
  };
}

function formatNailArea(area: NailArea | null) {
  if (!area) {
    return null;
  }

  return area === "manos" ? "Manos" : "Pies";
}

export function AdminDashboard({
  adminUsers,
  currentAdminEmail,
  initialAppointments,
  services,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<EditableAppointment | null>(null);
  const [message, setMessage] = useState("Revisa y actualiza la agenda desde aquí.");
  const [reservationAlert, setReservationAlert] = useState("");
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });
  const [adminMessage, setAdminMessage] = useState("");
  const [profileForm, setProfileForm] = useState({
    email: currentAdminEmail,
    password: "",
    confirmPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isAdminPending, startAdminTransition] = useTransition();
  const [isProfilePending, startProfileTransition] = useTransition();

  const nailService = useMemo(
    () => services.find((service) => service.slug === "unas") ?? null,
    [services],
  );

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
        (payload) => {
          if (payload.eventType === "INSERT") {
            const firstName =
              typeof payload.new.first_name === "string" ? payload.new.first_name : "Nueva clienta";
            setReservationAlert(`Nueva reservación recibida de ${firstName}.`);
          }

          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!reservationAlert) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setReservationAlert("");
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [reservationAlert]);

  const stats = useMemo(() => {
    const booked = initialAppointments.filter((item) => item.status === "booked").length;
    const cancelled = initialAppointments.filter((item) => item.status === "cancelled").length;
    return {
      total: initialAppointments.length,
      booked,
      cancelled,
    };
  }, [initialAppointments]);

  const hasSelectedNailService = Boolean(
    selected && nailService && selected.serviceIds.includes(nailService.id),
  );

  function openEditor(appointment: Appointment) {
    setSelected(toEditable(appointment));
    setMessage(`Editando la cita de ${appointment.firstName} ${appointment.lastName}.`);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleEditorService(serviceId: string) {
    setSelected((current) => {
      if (!current) {
        return current;
      }

      const exists = current.serviceIds.includes(serviceId);
      const nextServiceIds = exists
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId];

      return {
        ...current,
        serviceIds: nextServiceIds,
        nailArea: nailService && !nextServiceIds.includes(nailService.id) ? null : current.nailArea,
      };
    });
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

  async function handleCreateAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminMessage("Creando administradora...");

    startAdminTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm),
      });

      const result = (await response.json()) as { ok: boolean; message: string };
      setAdminMessage(result.message);

      if (result.ok) {
        setAdminForm({ email: "", password: "" });
        router.refresh();
      }
    });
  }

  async function handleProfileUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setProfileMessage("No fue posible iniciar el cliente de autenticación.");
      return;
    }

    if (
      profileForm.email.trim().toLowerCase() === currentAdminEmail.toLowerCase() &&
      !profileForm.password.trim()
    ) {
      setProfileMessage("Haz un cambio en el correo o en la contraseña antes de guardar.");
      return;
    }

    if (profileForm.password && profileForm.password.length < 6) {
      setProfileMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (profileForm.password !== profileForm.confirmPassword) {
      setProfileMessage("La confirmación de contraseña no coincide.");
      return;
    }

    setProfileMessage("Actualizando perfil...");

    startProfileTransition(async () => {
      const updates: { email?: string; password?: string } = {};

      if (profileForm.email.trim().toLowerCase() !== currentAdminEmail.toLowerCase()) {
        updates.email = profileForm.email.trim().toLowerCase();
      }

      if (profileForm.password.trim()) {
        updates.password = profileForm.password.trim();
      }

      const { error } = await supabase.auth.updateUser(updates);

      if (error) {
        setProfileMessage(error.message);
        return;
      }

      setProfileMessage("Tus datos de acceso fueron actualizados.");
      setProfileForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
      router.refresh();
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
        {reservationAlert ? <div className={styles.alertBanner}>{reservationAlert}</div> : null}

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.brandRow}>
              <Image
                alt="Studio Seven K"
                className={styles.logo}
                height={76}
                priority
                src="/studio-seven-k-logo.jpg"
                width={76}
              />
              <div>
                <p className={styles.eyebrow}>Panel administradora</p>
                <h1 className={styles.title}>Tu agenda viva de la semana</h1>
              </div>
            </div>
            <p className={styles.lead}>
              Cada cambio de la página pública aparece aquí para que puedas hacer
              seguimiento, reorganizar horarios y liberar cupos cuando sea necesario.
            </p>
          </div>
          <button className={styles.logoutButton} onClick={logout} type="button">
            Cerrar sesión
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
                  <article
                    className={`${styles.appointmentItem} ${
                      selected?.id === appointment.id ? styles.appointmentItemActive : ""
                    }`}
                    key={appointment.id}
                  >
                    <div className={styles.appointmentTop}>
                      <div>
                        <p className={styles.name}>
                          {appointment.firstName} {appointment.lastName}
                        </p>
                        <div className={styles.metaGrid}>
                          <p className={styles.meta}>
                            {appointment.date} | {appointment.timeSlot}
                          </p>
                          <p className={styles.meta}>Celular: {appointment.phoneNumber}</p>
                          {appointment.nailArea ? (
                            <p className={styles.meta}>
                              Uñas: {formatNailArea(appointment.nailArea)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span className={styles.statusTag}>
                        {STATUS_LABELS[appointment.status]}
                      </span>
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
                <div className={styles.emptyCard}>Aún no hay citas para esta semana.</div>
              )}
            </div>
          </article>

          <aside className={styles.editorCard} ref={editorRef}>
            <h2 className={styles.editorTitle}>Editor de cita</h2>
            <p className={styles.editorLead}>
              Puedes mover fecha, horario, servicios o marcar la reserva como cancelada.
            </p>

            {selected ? (
              <form className={styles.form} onSubmit={handleSave}>
                <div className={styles.editorNotice}>
                  Editando a {selected.firstName} {selected.lastName} para el {selected.date} a
                  las {selected.timeSlot}.
                </div>
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
                  Celular
                  <input
                    onChange={(event) =>
                      setSelected((current) =>
                        current ? { ...current, phoneNumber: event.target.value } : current,
                      )
                    }
                    type="tel"
                    value={selected.phoneNumber}
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
                    <option value="booked">{STATUS_LABELS.booked}</option>
                    <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                  </select>
                </label>

                <div className={styles.field}>
                  Servicios
                  <div className={styles.servicesGrid}>
                    {services.map((service) => (
                      <label className={styles.serviceOption} key={service.id}>
                        <input
                          checked={selected.serviceIds.includes(service.id)}
                          onChange={() => toggleEditorService(service.id)}
                          type="checkbox"
                        />
                        <span
                          style={
                            {
                              "--service-accent": service.accentColor,
                              background: `${service.accentColor}1f`,
                            } as React.CSSProperties
                          }
                        >
                          {service.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {hasSelectedNailService ? (
                  <div className={styles.field}>
                    ¿Uñas para manos o pies?
                    <div className={styles.nailAreaGrid}>
                      {(["manos", "pies"] as const).map((area) => (
                        <label className={styles.nailAreaOption} key={area}>
                          <input
                            checked={selected.nailArea === area}
                            onChange={() =>
                              setSelected((current) =>
                                current ? { ...current, nailArea: area } : current,
                              )
                            }
                            name="admin-nail-area"
                            type="radio"
                          />
                          <span>{formatNailArea(area)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

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

        <section className={styles.managementGrid}>
          <article className={styles.editorCard}>
            <h2 className={styles.editorTitle}>Mi acceso</h2>
            <p className={styles.editorLead}>
              Desde aquí puedes cambiar tu correo o tu contraseña cuando lo necesites.
            </p>

            <form className={styles.form} onSubmit={handleProfileUpdate}>
              <label className={styles.field}>
                Correo actual
                <input
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  value={profileForm.email}
                />
              </label>

              <label className={styles.field}>
                Nueva contraseña
                <input
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Déjala vacía si no cambiará"
                  type="password"
                  value={profileForm.password}
                />
              </label>

              <label className={styles.field}>
                Confirmar contraseña
                <input
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  type="password"
                  value={profileForm.confirmPassword}
                />
              </label>

              <button className={styles.saveButton} disabled={isProfilePending} type="submit">
                {isProfilePending ? "Guardando..." : "Actualizar acceso"}
              </button>
              <p className={styles.message}>{profileMessage}</p>
            </form>
          </article>

          <article className={styles.editorCard}>
            <h2 className={styles.editorTitle}>Usuarias admin</h2>
            <p className={styles.editorLead}>
              Crea nuevos accesos para el panel y revisa qué correos ya tienen permiso.
            </p>

            <form className={styles.form} onSubmit={handleCreateAdmin}>
              <label className={styles.field}>
                Correo de la nueva admin
                <input
                  onChange={(event) =>
                    setAdminForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  value={adminForm.email}
                />
              </label>

              <label className={styles.field}>
                Contraseña inicial
                <input
                  onChange={(event) =>
                    setAdminForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  type="password"
                  value={adminForm.password}
                />
              </label>

              <button className={styles.saveButton} disabled={isAdminPending} type="submit">
                {isAdminPending ? "Creando..." : "Crear administradora"}
              </button>
              <p className={styles.message}>{adminMessage}</p>
            </form>

            <div className={styles.adminList}>
              {adminUsers.map((adminUser) => (
                <article className={styles.adminRow} key={adminUser.id}>
                  <p className={styles.adminEmail}>{adminUser.email}</p>
                  <p className={styles.adminMeta}>
                    Creada {new Date(adminUser.createdAt).toLocaleDateString("es-BO")}
                  </p>
                  <p className={styles.adminMeta}>
                    Último acceso:{" "}
                    {adminUser.lastSignInAt
                      ? new Date(adminUser.lastSignInAt).toLocaleString("es-BO")
                      : "Sin ingresos todavía"}
                  </p>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
