"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { requestLoginCodeAction, verifyLoginCodeAction } from "@/app/actions";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";

type Stage = "email" | "code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Cooldown del botón "reenviar código"
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-focus en el input del código al pasar al stage 2
  useEffect(() => {
    if (stage === "code") {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [stage]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email)) {
      setError("Ingresá un email válido");
      return;
    }
    setSubmitting(true);
    try {
      await requestLoginCodeAction(email.trim().toLowerCase());
      setStage("code");
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el código");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("El código debe tener 6 dígitos");
      return;
    }
    setSubmitting(true);
    try {
      await verifyLoginCodeAction(email.trim().toLowerCase(), code);
      router.replace("/admin/agenda");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await requestLoginCodeAction(email.trim().toLowerCase());
      setResendCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reenviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-bg flex flex-col"
      style={{ height: "100dvh", maxWidth: 430, margin: "0 auto" }}
    >
      <div className="flex-shrink-0 px-[20px] pt-[12px] pb-[8px]">
        <Link href="/" aria-label="Volver">
          <button
            className="press-fx w-[36px] h-[36px] rounded-full border border-line bg-surface flex items-center justify-center"
            style={{ cursor: "pointer" }}
          >
            <Icon name="back" size={14} color="var(--ink-1)" />
          </button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] py-[24px]">
        <AnimatePresence mode="wait">
          {stage === "email" && (
            <motion.form
              key="email"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSendEmail}
              className="flex flex-col gap-[16px]"
            >
              <h1
                className="font-serif text-[34px] leading-[1.05] text-balance"
                style={{ letterSpacing: "-0.8px" }}
              >
                Entrá a tu negocio
              </h1>
              <p className="text-[14px] text-ink-2 leading-[1.5]">
                Te mandamos un código de 6 dígitos al email del dueño.
              </p>

              <div className="mt-[8px]">
                <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dueno@negocio.com"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                  className="w-full h-[48px] px-[14px] border border-line bg-surface rounded-sm text-[15px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
                  style={{ fontFamily: "inherit" }}
                />
              </div>

              {error && (
                <p className="text-[12px] text-danger">{error}</p>
              )}

              <Btn
                type="submit"
                size="lg"
                full
                loading={submitting}
                disabled={submitting || !EMAIL_RE.test(email)}
              >
                Enviarme el código
              </Btn>

              <p className="text-[12px] text-ink-3 text-center mt-[8px] leading-[1.5]">
                ¿Todavía no tenés cuenta?{" "}
                <Link href="/onboarding" className="text-ink-1 underline">
                  Crear mi negocio
                </Link>
              </p>
            </motion.form>
          )}

          {stage === "code" && (
            <motion.form
              key="code"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleVerify}
              className="flex flex-col gap-[16px]"
            >
              <h1
                className="font-serif text-[30px] leading-[1.05] text-balance"
                style={{ letterSpacing: "-0.6px" }}
              >
                Revisá tu mail
              </h1>
              <p className="text-[14px] text-ink-2 leading-[1.5]">
                Te mandamos un código a{" "}
                <span className="font-medium text-ink-1">{email}</span>. Vence en
                10 minutos.
              </p>

              <div className="mt-[8px]">
                <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">
                  Código de 6 dígitos
                </label>
                <input
                  ref={codeInputRef}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={6}
                  className="w-full h-[60px] px-[16px] border border-line bg-surface rounded-sm text-center font-mono text-[28px] tracking-[0.4em] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                />
                <p className="text-[11px] text-ink-3 mt-[6px] leading-[1.4]">
                  En iPhone, el código aparece arriba del teclado — tocalo para
                  pegarlo.
                </p>
              </div>

              {error && (
                <p className="text-[12px] text-danger">{error}</p>
              )}

              <Btn
                type="submit"
                size="lg"
                full
                loading={submitting}
                disabled={submitting || code.length !== 6}
              >
                Entrar
              </Btn>

              <div className="flex items-center justify-between mt-[8px] text-[12px] text-ink-3">
                <button
                  type="button"
                  onClick={() => {
                    setStage("email");
                    setCode("");
                    setError(null);
                  }}
                  className="text-ink-2 underline"
                  style={{ background: "transparent", border: 0, cursor: "pointer" }}
                >
                  Cambiar email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-ink-2 disabled:text-ink-3"
                  style={{ background: "transparent", border: 0, cursor: "pointer" }}
                >
                  {resendCooldown > 0
                    ? `Reenviar en ${resendCooldown}s`
                    : "Reenviar código"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
