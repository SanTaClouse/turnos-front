"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Btn } from "@/components/ui/btn";
import { loginPlatformAction } from "./actions";

/**
 * Pantalla de acceso al panel de plataforma. La "contraseña" es la
 * PLATFORM_ADMIN_KEY que configuraste en el backend.
 */
export function PlatformLogin() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await loginPlatformAction(key.trim());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clave incorrecta");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-bg flex flex-col items-center justify-center px-[24px]"
      style={{ height: "100dvh", maxWidth: 430, margin: "0 auto" }}
    >
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-[16px]"
      >
        <div className="w-[56px] h-[56px] rounded-full bg-line-2 flex items-center justify-center mb-[4px]">
          <ShieldCheck size={26} color="var(--ink-1)" />
        </div>

        <h1
          className="font-serif text-[30px] leading-[1.05]"
          style={{ letterSpacing: "-0.6px" }}
        >
          Panel de plataforma
        </h1>
        <p className="text-[14px] text-ink-2 -mt-[8px]">
          Ingresá tu clave de administrador para gestionar la facturación de los
          negocios.
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Clave de administrador"
          autoFocus
          className="h-[54px] rounded border border-line bg-surface px-[16px] text-[16px] text-ink-1 outline-none focus:border-ink-1"
        />

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Btn type="submit" loading={submitting} disabled={!key.trim()}>
          Entrar
        </Btn>
      </motion.form>
    </div>
  );
}
