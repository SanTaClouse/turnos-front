"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Appointment, Tenant } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/status-pill";

const SESSION_KEY = "turnosapp-client-session";

interface ClientSession {
  email: string;
  token: string;
  expiresAt: number; // ms epoch
}

// ─── Helpers ───────────────────────────────────────────────
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${days[date.getDay()]} ${d} de ${months[m - 1]}`;
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function loadSession(): ClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientSession;
    if (parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(s: ClientSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring" as const, stiffness: 380, damping: 30 },
};

// ─── Stage: Email ──────────────────────────────────────────
function EmailStage({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/otp/send", { email });
      onSent(email);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos enviar el código. Intentá de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...fadeUp}>
      <h1 className="font-serif text-[32px] leading-[1.1]" style={{ letterSpacing: "-0.5px" }}>
        Gestioná tu turno
      </h1>
      <p className="text-[14px] text-ink-2 mt-[10px] leading-[1.5]">
        Ingresá tu email. Te enviamos un código para verificar que sos vos.
      </p>

      <div className="mt-[28px]">
        <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          autoFocus
          className="w-full h-[54px] border border-line bg-surface rounded px-[16px] text-[16px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
          style={{ fontFamily: "inherit" }}
        />
      </div>

      {error && <p className="text-[12px] text-danger mt-[10px]">{error}</p>}

      <Btn onClick={handleSend} loading={loading} disabled={!valid} size="lg" full className="mt-[16px] gap-2">
        {!loading && <>Enviar código <Icon name="send" size={16} color="var(--bg)" /></>}
      </Btn>

      <div className="mt-[20px] flex items-start gap-[10px] px-[14px] py-[12px] bg-line-2 rounded-[12px]">
        <Icon name="lock" size={14} color="var(--ink-2)" />
        <p className="text-[11px] text-ink-2 leading-[1.5]">
          Protegemos tus datos con un código de verificación. Solo vos podés ver y modificar tus turnos.
        </p>
      </div>

      <p className="text-[11px] text-ink-3 mt-[16px] text-center leading-[1.5]">
        Sin email todavía? Pedile al negocio que te lo agregue, o reservá un turno nuevo dejando tu email.
      </p>
    </motion.div>
  );
}

// ─── Stage: OTP ────────────────────────────────────────────
function OTPStage({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: (token: string) => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const verifyCode = async (code: string) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await api.post<{ token: string; email: string }>(
        "/auth/otp/verify",
        { email, code },
      );
      onVerified(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código incorrecto");
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const setDigit = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d)) {
      verifyCode(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await api.post("/auth/otp/send", { email });
      setResendTimer(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos reenviar");
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div {...fadeUp}>
      <h1 className="font-serif text-[32px] leading-[1.1]" style={{ letterSpacing: "-0.5px" }}>
        Ingresá el código
      </h1>
      <p className="text-[14px] text-ink-2 mt-[10px] leading-[1.5]">
        Te enviamos un código de 6 dígitos a <span className="font-mono text-ink-1">{email}</span>.{" "}
        <button
          onClick={onBack}
          className="text-ink-1 underline underline-offset-2"
          style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "14px" }}
        >
          Cambiar
        </button>
      </p>

      <div className="flex gap-[8px] mt-[28px] justify-between">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            autoFocus={i === 0}
            disabled={verifying}
            className="font-mono text-[22px] font-medium text-center text-ink-1 bg-surface rounded outline-none transition-[border-color]"
            style={{
              width: 46,
              height: 56,
              border: `1px solid ${error ? "var(--danger)" : d ? "var(--ink-1)" : "var(--line)"}`,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          />
        ))}
      </div>

      {verifying && (
        <div className="flex items-center justify-center gap-[8px] mt-[18px] text-[13px] text-ink-2">
          <div className="w-[14px] h-[14px] border-2 border-ink-3 border-t-ink-1 rounded-full animate-spin" />
          Verificando…
        </div>
      )}

      {error && (
        <p className="text-[12px] text-danger mt-[12px] text-center">{error}</p>
      )}

      <div className="text-center mt-[24px] text-[13px] text-ink-3">
        {resendTimer > 0 ? (
          <span>
            Reenviar código en <span className="font-mono">{resendTimer}s</span>
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-[13px] font-medium text-ink-1"
            style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
          >
            {resending ? "Reenviando…" : "Reenviar código"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Appointment card ──────────────────────────────────────
function ApptCard({ appt, onCancel }: { appt: Appointment; onCancel: () => void }) {
  const endTime =
    appt.service && appt.time ? addMinutes(appt.time, appt.service.duration_minutes) : appt.end_time;
  const canCancel = appt.status !== "cancelled";

  return (
    <div className="bg-surface border border-line rounded-lg px-[18px] py-[16px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex-1 min-w-0">
          <StatusPill status={appt.status as "pending" | "confirmed" | "cancelled"} />
          <div className="text-[16px] font-semibold mt-[10px]" style={{ letterSpacing: "-0.2px" }}>
            {appt.service?.name ?? "Turno"}
          </div>
          <div className="text-[12px] text-ink-3 mt-[2px]">
            {appt.resource ? `con ${appt.resource.name} · ` : ""}
            {appt.service?.duration_minutes ?? "—"} min
          </div>
        </div>
      </div>

      <div className="mt-[14px] flex gap-[16px] items-center px-[14px] py-[12px] bg-line-2 rounded-[10px]">
        <div>
          <div className="label-mono">Fecha</div>
          <div className="text-[13px] font-medium mt-[2px]">{formatDate(appt.date)}</div>
        </div>
        <div className="w-[1px] h-[28px] bg-line" />
        <div>
          <div className="label-mono">Hora</div>
          <div className="font-mono text-[13px] font-medium mt-[2px]">
            {appt.time} – {endTime}
          </div>
        </div>
      </div>

      {canCancel && (
        <div className="flex gap-[8px] mt-[12px]">
          <Btn variant="secondary" size="md" full onClick={onCancel}>
            Cancelar
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── Cancel sheet ──────────────────────────────────────────
function CancelSheet({
  appt,
  onClose,
  onConfirm,
}: {
  appt: Appointment;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-ink-1/40 z-10"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="fixed bottom-0 left-0 right-0 bg-bg rounded-[22px_22px_0_0] px-[24px] pb-[34px] pt-[24px] z-20"
        style={{ maxWidth: 430, margin: "0 auto" }}
      >
        <div className="w-[40px] h-[4px] rounded-[2px] bg-line mx-auto mb-[20px]" />
        <h2 className="font-serif text-[24px] leading-[1.1]" style={{ letterSpacing: "-0.3px" }}>
          ¿Cancelar turno?
        </h2>
        <p className="text-[14px] text-ink-2 mt-[10px] leading-[1.5]">
          Vas a cancelar <strong>{appt.service?.name}</strong> del{" "}
          <strong>{formatDate(appt.date)}</strong> a las{" "}
          <strong className="font-mono">{appt.time}</strong>. Esta acción no se puede deshacer.
        </p>
        <div className="flex flex-col gap-[8px] mt-[20px]">
          <Btn variant="danger" size="lg" full onClick={onConfirm}>
            Sí, cancelar
          </Btn>
          <Btn variant="ghost" size="lg" full onClick={onClose}>
            Mantener turno
          </Btn>
        </div>
      </motion.div>
    </>
  );
}

// ─── Stage: Lista de turnos ────────────────────────────────
function ListStage({
  email,
  tenant,
  onLogout,
}: {
  email: string;
  tenant: Tenant;
  onLogout: () => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelDone, setCancelDone] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Appointment[]>(
        `/appointments?tenantId=${tenant.id}&clientEmail=${encodeURIComponent(email)}`,
      );
      setAppointments(data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, tenant.id]);

  const today = new Date().toISOString().slice(0, 10);
  const active = appointments.filter(
    (a) => a.status !== "cancelled" && a.date >= today,
  );
  const past = appointments.filter(
    (a) => a.status === "cancelled" || a.date < today,
  );

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.patch(`/appointments/${cancelTarget.id}/cancel`, {});
      setCancelTarget(null);
      setCancelDone(true);
    } catch {
      setCancelTarget(null);
    }
  };

  if (cancelDone) {
    return (
      <motion.div {...fadeUp} className="text-center pt-[40px]">
        <div className="w-[72px] h-[72px] rounded-full bg-line-2 inline-flex items-center justify-center">
          <Icon name="check" size={28} color="var(--ink-2)" strokeWidth={2.5} />
        </div>
        <h2 className="font-serif text-[28px] leading-[1.1] mt-[20px]" style={{ letterSpacing: "-0.4px" }}>
          Turno cancelado
        </h2>
        <p className="text-[14px] text-ink-2 mt-[8px] leading-[1.5]" style={{ maxWidth: 280, margin: "8px auto 0" }}>
          Ya le avisamos al negocio.
        </p>
        <div className="mt-[24px] flex flex-col gap-[8px]">
          <Btn variant="secondary" size="md" full={false} onClick={() => { setCancelDone(false); load(); }}>
            Ver mis turnos
          </Btn>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeUp}>
      <div className="flex items-baseline justify-between gap-[12px] mb-[8px]">
        <h1 className="font-serif text-[30px] leading-[1.1]" style={{ letterSpacing: "-0.5px" }}>
          Tus turnos
        </h1>
        <button
          onClick={onLogout}
          className="text-[12px] text-ink-3 underline underline-offset-2"
          style={{ background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit" }}
        >
          Salir
        </button>
      </div>

      {loading ? (
        <div className="mt-[20px] flex flex-col gap-[10px]">
          {[0, 1].map((i) => (
            <div key={i} className="h-[140px] rounded-lg bg-line-2 animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 && past.length === 0 ? (
        <div className="text-center mt-[40px]">
          <p className="text-[14px] text-ink-2">No tenemos turnos asociados a este email.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <p className="text-[14px] text-ink-2 mt-[8px]">
                {active.length} turno{active.length !== 1 ? "s" : ""} activo{active.length !== 1 ? "s" : ""}
              </p>
              <div className="mt-[20px] flex flex-col gap-[10px]">
                {active.map((a) => (
                  <ApptCard key={a.id} appt={a} onCancel={() => setCancelTarget(a)} />
                ))}
              </div>
            </>
          )}

          {past.length > 0 && (
            <details className="mt-[24px]">
              <summary
                className="label-mono cursor-pointer flex items-center gap-[6px]"
                style={{ listStyle: "none" }}
              >
                <Icon name="chevronDown" size={12} color="var(--ink-3)" />
                Historial · {past.length}
              </summary>
              <div className="mt-[12px] flex flex-col gap-[8px]">
                {past.slice(0, 10).map((a) => (
                  <div
                    key={a.id}
                    className="bg-surface border border-line rounded p-[12px_14px] flex items-center gap-[12px]"
                    style={{ opacity: 0.7 }}
                  >
                    <span className="font-mono text-[11px] text-ink-3" style={{ width: 60 }}>
                      {formatDate(a.date).split(" ").slice(1, 3).join(" ")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{a.service?.name}</div>
                      <div className="text-[11px] text-ink-3 mt-[1px]">
                        {a.time}
                        {a.status === "cancelled" && <span className="ml-[6px] text-danger">cancelado</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <AnimatePresence>
        {cancelTarget && (
          <CancelSheet
            appt={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={handleCancel}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export default function MiTurnoPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "otp" | "list" | "loading">("loading");
  const [email, setEmail] = useState("");
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // Cargar tenant + restaurar sesión al montar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await api.get<Tenant>(`/tenants/slug/${params.slug}`);
        if (cancelled) return;
        setTenant(t);

        // Verificar si hay token + appointmentId en query params (desde email)
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const tokenFromEmail = urlParams.get("token");
          const appointmentId = urlParams.get("appointmentId");

          if (tokenFromEmail && appointmentId) {
            // Auto-verificar usando el token del email
            setStage("loading");
            try {
              // Llamar al backend para verificar el token
              const result = await api.post<{ verified: true }>(`/appointments/${appointmentId}/verify-by-token`, {
                token: tokenFromEmail,
              });

              if (result.verified) {
                // Token verificado, guardar sesión temporal y mostrar lista
                // Para esto, necesitamos obtener el email del turno desde el backend
                const appt = await api.get<Appointment>(`/appointments/${appointmentId}`);
                if (appt.client?.email) {
                  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
                  saveSession({
                    email: appt.client.email,
                    token: "verified-by-email-token",
                    expiresAt,
                  });
                  setEmail(appt.client.email);
                  setStage("list");
                  return;
                }
              }
            } catch {
              // Token inválido o expirado, mostrar email form
              setStage("email");
              return;
            }
          }
        }

        // Restaurar sesión normal si existe
        const session = loadSession();
        if (session) {
          setEmail(session.email);
          setStage("list");
        } else {
          setStage("email");
        }
      } catch {
        if (!cancelled) router.push("/");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.slug, router]);

  const handleVerified = (token: string) => {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 días
    saveSession({ email, token, expiresAt });
    setStage("list");
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setEmail("");
    setStage("email");
  };

  const handleBack = () => {
    if (stage === "email" || stage === "loading") {
      router.push(`/${params.slug}`);
      return;
    }
    if (stage === "otp") {
      setStage("email");
      return;
    }
    handleLogout();
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="px-[20px] pt-[8px] pb-[0] flex-shrink-0">
        <button
          onClick={handleBack}
          className="press-fx w-[36px] h-[36px] rounded-full flex items-center justify-center"
          aria-label="Volver"
          style={{ background: "transparent", border: 0 }}
        >
          <Icon name="back" size={20} color="var(--ink-1)" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] py-[16px]">
        {stage === "loading" && (
          <div className="flex items-center justify-center pt-[60px]">
            <div className="w-[20px] h-[20px] border-2 border-ink-3 border-t-ink-1 rounded-full animate-spin" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {stage === "email" && (
            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmailStage onSent={(e) => { setEmail(e); setStage("otp"); }} />
            </motion.div>
          )}
          {stage === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OTPStage email={email} onVerified={handleVerified} onBack={() => setStage("email")} />
            </motion.div>
          )}
          {stage === "list" && tenant && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ListStage email={email} tenant={tenant} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
