"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/admin-login-form.module.css";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Props = {
  configured: boolean;
};

export function AdminLoginForm({ configured }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured) {
      setMessage("Faltan variables de Supabase para iniciar sesion.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("No fue posible iniciar el cliente de autenticacion.");
      return;
    }

    setMessage("Ingresando...");

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Panel administradora</p>
      <h1 className={styles.title}>Controla tu agenda en tiempo real</h1>
      <p className={styles.lead}>
        Entra con tu correo y contrasena para revisar, editar o cancelar citas.
      </p>

      {!configured ? (
        <div className={styles.disabled}>
          Configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
          `SUPABASE_SERVICE_ROLE_KEY` antes de usar el acceso admin.
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Correo
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className={styles.field}>
          Contrasena
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <button className={styles.button} disabled={isPending || !configured} type="submit">
          {isPending ? "Ingresando..." : "Entrar"}
        </button>
        <p className={styles.message}>{message}</p>
      </form>
    </div>
  );
}
