"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Appointment } from "@/types/api";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/status-pill";

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

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring" as const, stiffness: 380, damping: 30 },
};

// ─── Stage: Teléfono ───────────────────────────────────────
function PhoneStage({ onSend }: { onSend: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const ok = phone.replace(/\D/g, "").length >= 8;

  const handleSend = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900)); // TODO: POST /auth/otp
    setLoading(false);
    onSend(phone);
  };

  return (
    <motion.div {...fadeUp}>
      <h1 className="font-serif text-[32px] leading-[1.1]" style={{ letterSpacing: "-0.5px" }}>
        Gestioná tu turno
      </h1>
      <p className="text-[14px] text-ink-2 mt-[10px] leading-[1.5]">
        Ingresá tu número de WhatsApp. Te enviamos un código para verificar que sos vos.
      </p>

      <div className="mt-[28px]">
        <label className="block text-[12px] font-medium text-ink-2 mb-[6px]">Teléfono</label>
        <div className="flex gap-[6px]">
          <div className="flex items-center px-[14px] h-[54px] border border-line bg-surface rounded text-[15px] font-medium whitespace-nowrap flex-shrink-0">
            🇦🇷 +54
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="11 5555 2200"
            inputMode="tel"
            autoFocus
            className="flex-1 h-[54px] border border-line bg-surface rounded px-[16px] text-[16px] text-ink-1 outline-none focus-visible:outline-[2px] focus-visible:outline-accent"
            style={{ fontFamily: "inherit" }}
          />
        </div>
      </div>

      <Btn onClick={handleSend} loading={loading} disabled={!ok} size="lg" full className="mt-[16px] gap-2">
        {!loading && <>Enviar código <Icon name="whatsapp" size={16} color="var(--bg)" /></>}
      </Btn>

      <div className="mt-[20px] flex items-start gap-[10px] px-[14px] py-[12px] bg-line-2 rounded-[12px]">
        <Icon name="lock" size={14} color="var(--ink-2)" />
        <p className="text-[11px] text-ink-2 leading-[1.5]">
          Protegemos tus datos con un código de verificación. Solo vos podés ver y modificar tus turnos.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Stage: OTP ────────────────────────────────────────────
function OTPStage({ phone, onVerified }: { phone: string; onVerified: () => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown para reenviar
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const setDigit = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    // Auto-verificar cuando los 6 están completos
    if (next.every((d) => d)) {
      verifyCode(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const verifyCode = async (_code: string) => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 700)); // TODO: POST /auth/otp/verify
    setVerifying(false);
    onVerified();
  };

  return (
    <motion.div {...fadeUp}>
      <h1 className="font-serif text-[32px] leading-[1.1]" style={{ letterSpacing: "-0.5px" }}>
        Ingresá el código
      </h1>
      <p className="text-[14px] text-ink-2 mt-[10px] leading-[1.5]">
        Te enviamos un código de 6 dígitos por WhatsApp al{" "}
        <span className="font-mono text-ink-1">+54 {phone}</span>
      </p>

      {/* 6 inputs */}
      <div className="flex gap-[8px] mt-[28px] justify-between">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            autoFocus={i === 0}
            className="font-mono text-[22px] font-medium text-center text-ink-1 bg-surface rounded outline-none transition-[border-color]"
            style={{
              width: 46,
              height: 56,
              border: `1px solid ${d ? "var(--ink-1)" : "var(--line)"}`,
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

      <div className="text-center mt-[24px] text-[13px] text-ink-3">
        {resendTimer > 0 ? (
          <span>
            Reenviar código en <span className="font-mono">{resendTimer}s</span>
          </span>
        ) : (
          <button
            onClick={() => setResendTimer(30)}
            className="text-[13px] font-medium text-ink-1"
            style={{ background: "transparent", border: 0, fontFamily: "inherit", cursor: "pointer" }}
          >
            Reenviar código
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Appointment card ──────────────────────────────────────
function ApptCard({ appt, onCancel }: { appt: Appointment; onCancel: () => void }) {
  const endTime = appt.service && appt.time
    ? addMinutes(appt.time, appt.service.duration_minutes)
    : appt.end_time;

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
            {appt.resource ? `con ${appt.resource.name} · ` : ""}{appt.service?.duration_minutes ?? "—"} min
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
          <div className="font-mono text-[13px] font-medium mt-[2px]">{appt.time} – {endTime}</div>
        </div>
      </div>

      {canCancel && (
        <div className="flex gap-[8px] mt-[12px]">
          <Btn variant="secondary" size="md" full onClick={onCancel}>Cancelar</Btn>
        </div>
      )}
    </div>
  );
}

// ─── Cancel bottom sheet ───────────────────────────────────
function CancelSheet({ appt, onClose, onConfirm }: {
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

// ─── Stage: Lista ──────────────────────────────────────────
function ListStage({ phone, tenantId }: { phone: string; tenantId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelDone, setCancelDone] = useState(false);

  useEffect(() => {
    api.get<Appointment[]>(`/appointments?tenantId=${tenantId}&clientPhone=+54${phone.replace(/\D/g, "")}`)
      .then((data) => setAppointments(data.filter((a) => a.status !== "cancelled")))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [phone, tenantId]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.patch(`/appointments/${cancelTarget.id}/cancel`, {});
      setAppointments((prev) => prev.filter((a) => a.id !== cancelTarget.id));
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
          Ya le avisamos al negocio. Te llegó la confirmación por WhatsApp.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeUp}>
      <h1 className="font-serif text-[30px] leading-[1.1]" style={{ letterSpacing: "-0.5px" }}>
        Tus turnos
      </h1>

      {loading ? (
        <div className="mt-[20px] flex flex-col gap-[10px]">
          {[0, 1].map((i) => (
            <div key={i} className="h-[140px] rounded-lg bg-line-2 animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-[14px] text-ink-2 mt-[12px]">No tenés turnos activos.</p>
      ) : (
        <>
          <p className="text-[14px] text-ink-2 mt-[8px]">{appointments.length} turno{appointments.length !== 1 ? "s" : ""} activo{appointments.length !== 1 ? "s" : ""}</p>
          <div className="mt-[20px] flex flex-col gap-[10px]">
            {appointments.map((a) => (
              <ApptCard key={a.id} appt={a} onCancel={() => setCancelTarget(a)} />
            ))}
          </div>
        </>
      )}

      {/* Bottom sheet de cancelación */}
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
  const [stage, setStage] = useState<"phone" | "otp" | "list">("phone");
  const [phone, setPhone] = useState("");

  // Para pasar tenantId al stage de lista, lo leemos de la URL slug
  // En un sistema real, el tenantId vendría del token OTP verificado
  // Por ahora usamos el slug para construir la query
  const handleBack = () => {
    if (stage === "phone") { router.push(`/${params.slug}`); return; }
    if (stage === "otp") { setStage("phone"); return; }
    setStage("phone");
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      {/* Header */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scroll px-[24px] py-[16px]">
        <AnimatePresence mode="wait">
          {stage === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PhoneStage onSend={(p) => { setPhone(p); setStage("otp"); }} />
            </motion.div>
          )}
          {stage === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OTPStage phone={phone} onVerified={() => setStage("list")} />
            </motion.div>
          )}
          {stage === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ListStage phone={phone} tenantId={params.slug} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
