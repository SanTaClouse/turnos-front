"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Btn } from "@/components/ui/btn";
import { Icon } from "@/components/ui/icon";
import { BrandMark } from "@/components/ui/brand-mark";
import { ResourceAvatar } from "@/components/ui/resource-avatar";
import { ViewContentTracker } from "@/components/providers/ViewContentTracker";
import { trackEventOnce } from "@/lib/meta-pixel";

const trackStartOnboarding = (ctaPosition: "hero" | "mid" | "final") => {
  // Una sola vez por sesión, independiente del CTA clickeado — la intención es la misma.
  trackEventOnce("meta_pixel_initiate_checkout", "InitiateCheckout", {
    content_name: "promo_to_onboarding",
    cta_position: ctaPosition,
  });
};

// ════════════════════════════════════════════════════════════
// LANDING /empezar — pensada para bio de Instagram
// Mobile-first, scrolleable, max 430px de ancho.
// ════════════════════════════════════════════════════════════

const EASE = [0.22, 1, 0.36, 1] as const;

// Fade + rise al entrar en viewport. Una sola vez, para que el
// scroll hacia arriba no re-anime todo.
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -40px 0px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function EmpezarView() {
  return (
    <div
      className="min-h-screen bg-bg"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <ViewContentTracker content_name="promo" content_category="sales_landing" />
      <PromoBar />

      <main className="px-[20px] pb-[120px]">
        <Hero />
        <MockupSection
          eyebrow="01 · Tu link público"
          title={
            <>
              Tu negocio online,<br />
              <em className="not-italic" style={{ color: "var(--accent)" }}>
                listo en 5 minutos.
              </em>
            </>
          }
          copy="Compartís tu link por Instagram, WhatsApp o donde quieras. Tus clientes reservan sin descargar nada."
          mock={<MockLandingPublic />}
        />

        <MockupSection
          eyebrow="02 · Reserva en 60 segundos"
          title={
            <>
              Tus clientes reservan{" "}
              <em className="not-italic" style={{ color: "var(--accent)" }}>
                como si chatearan
              </em>.
            </>
          }
          copy="Sin formularios largos, sin apps que instalar. Servicio, día, hora y listo. Te llega la notificación al toque."
          mock={<MockBookingChat />}
        />

        <MockupSection
          eyebrow="03 · Tu agenda viva"
          title={
            <>
              Mirás tu día,<br />
              confirmás con{" "}
              <em className="not-italic" style={{ color: "var(--accent)" }}>
                un toque
              </em>.
            </>
          }
          copy="Cada profesional con su color. La línea de la hora actual te dice dónde estás."
          mock={<MockAgenda />}
        />

        <Beneficios />
        <PizzaPitch />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>

      <FloatingWhatsApp />
    </div>
  );
}

// ─── Floating WhatsApp ────────────────────────────────────────
function FloatingWhatsApp() {
  const [expanded, setExpanded] = useState(true);
  const phone = "543424639480";
  const msg = encodeURIComponent(
    "Hola! Vi la página de Turno1Min y tengo una consulta.",
  );
  const href = `https://wa.me/${phone}?text=${msg}`;

  return (
    <div
      className="fixed z-40 flex items-center gap-[8px]"
      style={{
        right: 16,
        bottom: 20,
        // En desktop: pegado al borde derecho de la columna 430px
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {expanded && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="relative bg-surface border border-line rounded-[14px] py-[8px] pl-[12px] pr-[28px] shadow-fab"
          style={{ maxWidth: 220 }}
        >
          <div className="text-[11px] font-medium leading-[1.3]" style={{ letterSpacing: "-0.2px" }}>
            ¿Tenés más dudas?
          </div>
          <div className="text-[10px] text-ink-2 leading-[1.3] mt-[1px]">
            Hablá directo con el dueño.
          </div>
          <button
            onClick={() => setExpanded(false)}
            aria-label="Cerrar"
            className="absolute top-[4px] right-[4px] w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{ background: "transparent", border: 0, cursor: "pointer" }}
          >
            <Icon name="close" size={10} color="var(--ink-3)" />
          </button>
          <div
            className="absolute"
            style={{
              right: -5,
              top: "50%",
              transform: "translateY(-50%) rotate(45deg)",
              width: 10,
              height: 10,
              background: "var(--surface)",
              borderRight: "1px solid var(--line)",
              borderTop: "1px solid var(--line)",
            }}
          />
        </motion.div>
      )}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setExpanded(false)}
        className="press-fx flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          background: "var(--whatsapp)",
          boxShadow:
            "0 10px 24px rgba(37,211,102,0.35), 0 4px 10px rgba(15,15,14,0.18)",
        }}
        aria-label="Hablar por WhatsApp"
      >
        <Icon name="whatsapp" size={26} color="#ffffff" />
      </a>
    </div>
  );
}

// ─── Barra promo sticky ───────────────────────────────────────
function PromoBar() {
  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center gap-[6px] px-[16px] py-[10px] text-[12px] font-medium"
      style={{
        background: "var(--ink-1)",
        color: "var(--bg)",
        letterSpacing: "-0.1px",
      }}
    >
      <span style={{ fontSize: 14 }}>🔥</span>
      <span>Primeros 30 clientes gratis · Sin tarjeta</span>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-[36px] pb-[24px]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex items-center gap-[8px] mb-[18px]"
      >
        <BrandMark initials="T" size={32} />
        <span className="font-mono text-[11px] text-ink-3 tracking-[0.06em]">
          TURNO1MIN
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
        className="font-serif text-[44px] leading-[1.02] text-balance"
        style={{ letterSpacing: "-1px" }}
      >
        Tu negocio recibiendo{" "}
        <em className="not-italic" style={{ color: "var(--accent)" }}>
          reservas online
        </em>{" "}
        en 5 minutos.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
        className="mt-[16px] text-[15px] text-ink-2 leading-[1.55]"
        style={{ maxWidth: 360 }}
      >
        Sin contestar más &quot;¿tenés turno mañana?&quot; por WhatsApp.
        Tus clientes reservan solos, vos sólo confirmás.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.24, ease: EASE }}
        className="mt-[24px] flex flex-col gap-[10px]"
      >
        <Link href="/onboarding" className="w-full" onClick={() => trackStartOnboarding("hero")}>
          <Btn variant="primary" size="lg" full className="gap-2">
            Crear mi negocio gratis
            <Icon name="forward" size={16} color="var(--bg)" />
          </Btn>
        </Link>
        <p className="font-mono text-[11px] text-ink-3 text-center">
          30 clientes gratis · Sin tarjeta · Cancelás cuando quieras
        </p>
      </motion.div>
    </section>
  );
}

// ─── "Una pizza" pitch ────────────────────────────────────────
function PizzaPitch() {
  return (
    <section className="py-[24px] my-[12px]">
      <Reveal className="relative rounded-lg border border-line bg-surface p-[22px_20px] overflow-hidden">
        <div className="label-mono mb-[12px]">El trato</div>
        <p
          className="font-serif text-[24px] leading-[1.15] text-balance"
          style={{ letterSpacing: "-0.4px" }}
        >
          Un{" "}
          <em className="not-italic" style={{ color: "var(--accent)" }}>
            robot
          </em>{" "}
          que trabaja por vos{" "}
          <span className="font-mono text-[20px]">24 hs</span>,<br />
          todo el mes,<br />
          por el precio de{" "}
          <em className="not-italic" style={{ color: "var(--accent)" }}>
            una pizza
          </em>.
        </p>
        <div className="mt-[16px] flex items-baseline gap-[6px]">
          <span className="font-mono text-[11px] text-ink-3 line-through">
            $20.000
          </span>
          <span
            className="font-mono text-[11px] font-semibold"
            style={{ color: "var(--status-confirmed)" }}
          >
            GRATIS hasta 30 clientes
          </span>
        </div>
      </Reveal>
    </section>
  );
}

// ─── Sección de mockup con copy ───────────────────────────────
function MockupSection({
  eyebrow,
  title,
  copy,
  mock,
}: {
  eyebrow: string;
  title: React.ReactNode;
  copy: string;
  mock: React.ReactNode;
}) {
  return (
    <section className="py-[40px]">
      <Reveal>
        <div className="label-mono mb-[10px]">{eyebrow}</div>
        <h2
          className="font-serif text-[32px] leading-[1.05] text-balance"
          style={{ letterSpacing: "-0.6px" }}
        >
          {title}
        </h2>
        <p
          className="mt-[12px] text-[14px] text-ink-2 leading-[1.5]"
          style={{ maxWidth: 360 }}
        >
          {copy}
        </p>
      </Reveal>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mt-[28px]"
      >
        <PhoneFrame>{mock}</PhoneFrame>
      </motion.div>
    </section>
  );
}

// ─── Phone frame wrapper ──────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        maxWidth: 320,
        borderRadius: 32,
        background: "var(--ink-1)",
        padding: 6,
        boxShadow:
          "0 24px 48px -12px rgba(15,15,14,0.18), 0 8px 16px -8px rgba(15,15,14,0.12)",
      }}
    >
      <div
        style={{
          borderRadius: 26,
          background: "var(--bg)",
          overflow: "hidden",
          aspectRatio: "9 / 17",
          position: "relative",
        }}
      >
        {/* Notch decorativa */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 80,
            height: 18,
            background: "var(--ink-1)",
            borderRadius: 999,
            zIndex: 30,
          }}
        />
        <div className="absolute inset-0 overflow-y-auto hide-scroll pt-[34px]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── MOCKUP 1 — Landing pública del negocio ──────────────────
function MockLandingPublic() {
  return (
    <div className="px-[16px] pt-[12px]">
      {/* Hero header */}
      <div className="flex items-center gap-[10px]">
        <BrandMark initials="BL" size={38} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ letterSpacing: "-0.2px" }}>
            Barbería Lucas
          </div>
          <div className="text-[10px] text-ink-3 truncate">
            Cortes clásicos en Palermo
          </div>
        </div>
        <div className="w-[28px] h-[28px] rounded-full border border-line bg-surface flex items-center justify-center">
          <Icon name="whatsapp" size={13} color="var(--ink-2)" />
        </div>
      </div>

      {/* Headline */}
      <div
        className="font-serif text-[26px] leading-[1] mt-[24px]"
        style={{ letterSpacing: "-0.4px" }}
      >
        Reservá tu turno en{" "}
        <em className="not-italic" style={{ color: "var(--accent)" }}>
          segundos
        </em>
        .
      </div>
      <div className="text-[10px] text-ink-2 mt-[8px]">
        Elegí el servicio, el día y la hora.
      </div>

      {/* CTAs */}
      <div className="mt-[14px] flex flex-col gap-[6px]">
        <button
          className="h-[36px] rounded bg-ink-1 text-bg text-[12px] font-medium flex items-center justify-center gap-[6px]"
          style={{ border: 0 }}
        >
          Reservar turno
          <Icon name="forward" size={11} color="var(--bg)" />
        </button>
        <button
          className="h-[32px] rounded bg-surface border border-line text-[11px] font-medium"
        >
          Ya tengo un turno
        </button>
      </div>

      {/* Servicios */}
      <div className="mt-[18px]">
        <div className="label-mono" style={{ fontSize: 8 }}>
          SERVICIOS · 3
        </div>
        <div className="mt-[8px] flex flex-col gap-[6px]">
          {[
            { name: "Corte clásico", dur: "30 min", price: "$8.500" },
            { name: "Corte + barba", dur: "45 min", price: "$12.000" },
            { name: "Solo barba", dur: "20 min", price: "$5.500" },
          ].map((s) => (
            <div
              key={s.name}
              className="bg-surface border border-line rounded flex items-center gap-[8px] px-[10px] py-[8px]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                  {s.name}
                </div>
                <div className="font-mono text-[9px] text-ink-3 mt-[1px]">
                  {s.dur}
                </div>
              </div>
              <div className="font-mono text-[10px] text-ink-2 font-medium">
                {s.price}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-[16px] pb-[20px] text-center">
        <span
          className="font-mono text-[8px] text-ink-3"
          style={{ letterSpacing: "0.06em" }}
        >
          GESTIONADO POR TURNO1MIN
        </span>
      </div>
    </div>
  );
}

// ─── MOCKUP 2 — Reserva conversacional (paso hora) ───────────
function MockBookingChat() {
  return (
    <div className="flex flex-col h-full">
      {/* Header con progreso */}
      <div className="px-[14px] pt-[8px] pb-[10px] flex-shrink-0">
        <div className="flex items-center gap-[8px] mb-[10px]">
          <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center">
            <Icon name="back" size={14} color="var(--ink-1)" />
          </div>
          <BrandMark initials="BL" size={22} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold" style={{ letterSpacing: "-0.2px", lineHeight: 1.1 }}>
              Barbería Lucas
            </div>
            <div className="font-mono text-[8px] text-ink-3" style={{ letterSpacing: "0.05em" }}>
              PASO 3 DE 5
            </div>
          </div>
        </div>
        <div className="h-[2px] bg-line rounded-[2px] overflow-hidden">
          <div className="h-full bg-ink-1 rounded-[2px]" style={{ width: "60%" }} />
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 px-[14px] pb-[14px] overflow-hidden">
        {/* Bubble asistente — intro */}
        <ChatBubbleAssistant>
          <span className="text-[11px]">
            ¡Hola! 👋 Soy el asistente de <strong>Barbería Lucas</strong>.
          </span>
        </ChatBubbleAssistant>

        {/* Servicio elegido */}
        <ChatBubbleUser>Corte clásico</ChatBubbleUser>

        {/* Fecha elegida */}
        <ChatBubbleUser>Sáb 24 de mayo</ChatBubbleUser>

        {/* Asistente — pregunta hora */}
        <ChatBubbleAssistant>
          <span className="text-[11px]">
            Buenísimo. Estos son los horarios disponibles:
          </span>
        </ChatBubbleAssistant>

        {/* Grupo: Tarde */}
        <div className="mt-[10px]">
          <div className="label-mono mb-[5px]" style={{ fontSize: 8 }}>
            TARDE · 4
          </div>
          <div className="grid grid-cols-3 gap-[4px]">
            {[
              { time: "14:00", who: "Carlos", hue: 24 },
              { time: "14:30", who: "María", hue: 220 },
              { time: "15:00", who: "Carlos", hue: 24 },
              { time: "15:30", who: "María", hue: 220 },
            ].map((s) => (
              <div
                key={s.time}
                className="bg-surface border border-line rounded-[8px] py-[5px] px-[3px] flex flex-col items-center gap-[1px]"
              >
                <span className="text-[10px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                  {s.time}
                </span>
                <span className="text-[8px] text-ink-3">con {s.who}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Typing indicator */}
        <div className="mt-[10px] bg-surface border border-line rounded-[12px_12px_12px_3px] px-[10px] py-[8px] flex gap-[3px] items-center w-[44px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[4px] h-[4px] rounded-full bg-ink-3 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatBubbleAssistant({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-surface border border-line rounded-[12px_12px_12px_3px] px-[10px] py-[7px] mt-[8px]"
      style={{ maxWidth: "82%" }}
    >
      {children}
    </div>
  );
}

function ChatBubbleUser({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-ink-1 text-bg rounded-[12px_12px_3px_12px] px-[10px] py-[6px] mt-[6px] text-[10px] font-medium"
      style={{ maxWidth: "82%", marginLeft: "auto", letterSpacing: "-0.2px" }}
    >
      {children}
    </div>
  );
}

// ─── MOCKUP 3 — Agenda del dueño (vista día) ─────────────────
function MockAgenda() {
  // Hours visible: 9 → 16 para que entre en el frame
  const hours = [9, 10, 11, 12, 13, 14, 15, 16];

  // Bloques de turno (top en px desde el inicio del timeline 09:00)
  const appts = [
    { top: 30, height: 56, time: "09:30", client: "Juan García", svc: "Corte clásico", hue: 24, who: "C", status: "confirmed" },
    { top: 130, height: 80, time: "10:40", client: "Sofía L.", svc: "Corte + barba", hue: 220, who: "M", status: "pending" },
    { top: 232, height: 56, time: "12:20", client: "Pedro R.", svc: "Solo barba", hue: 24, who: "C", status: "confirmed" },
    { top: 310, height: 56, time: "13:30", client: "Ana C.", svc: "Corte clásico", hue: 220, who: "M", status: "confirmed" },
  ];

  return (
    <div className="px-[12px] pt-[8px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[10px]">
        <div>
          <div className="font-serif text-[18px] leading-[1]" style={{ letterSpacing: "-0.3px" }}>
            Hoy
          </div>
          <div className="font-mono text-[9px] text-ink-3 mt-[2px]" style={{ letterSpacing: "0.05em" }}>
            SÁB 24 MAY · 4 TURNOS
          </div>
        </div>
        <div className="flex gap-[3px]">
          <div className="px-[8px] py-[3px] rounded-full bg-ink-1 text-bg text-[9px] font-mono">
            DÍA
          </div>
          <div className="px-[8px] py-[3px] rounded-full bg-surface border border-line text-ink-3 text-[9px] font-mono">
            SEM
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex gap-[6px] relative" style={{ height: 380 }}>
        {/* Horas */}
        <div className="flex-shrink-0 relative" style={{ width: 26 }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute font-mono text-[8px] text-ink-2"
              style={{ top: i * 50, transform: "translateY(-50%)" }}
            >
              {`${String(h).padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Área de turnos */}
        <div className="flex-1 relative">
          {/* Lines */}
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-line-2"
              style={{ top: i * 50 }}
            />
          ))}

          {/* Bloques */}
          {appts.map((a) => {
            const accent = `oklch(0.62 0.13 ${a.hue})`;
            const statusBorder =
              a.status === "confirmed"
                ? "var(--status-confirmed)"
                : "var(--status-pending)";
            return (
              <div
                key={a.time}
                className="absolute left-0 right-0 bg-surface rounded-[6px] py-[4px] flex items-start gap-[4px] overflow-hidden"
                style={{
                  top: a.top,
                  height: a.height,
                  paddingLeft: 6,
                  paddingRight: 6,
                  border: "1px solid var(--line)",
                  borderLeft: `2px solid ${statusBorder}`,
                  boxShadow: `inset 4px 0 0 -2px ${accent}`,
                }}
              >
                <ResourceAvatar initials={a.who} hue={a.hue} size={18} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[9px] font-semibold text-ink-1">
                    {a.time}
                  </div>
                  <div className="text-[10px] font-medium truncate" style={{ letterSpacing: "-0.2px" }}>
                    {a.client}
                  </div>
                  <div className="text-[8px] text-ink-3 truncate">{a.svc}</div>
                </div>
              </div>
            );
          })}

          {/* Now line */}
          <div
            className="absolute left-0 right-0 flex items-center gap-[3px] z-20 pointer-events-none"
            style={{ top: 190 }}
          >
            <div
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ background: "var(--accent)" }}
            />
            <div
              className="flex-1 h-[1px]"
              style={{ background: "var(--accent)" }}
            />
          </div>
        </div>
      </div>

      {/* FAB */}
      <div className="flex justify-end mt-[8px]">
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
          style={{
            background: "var(--ink-1)",
            boxShadow:
              "0 8px 20px rgba(15,15,14,0.25), 0 2px 6px rgba(15,15,14,0.15)",
          }}
        >
          <Icon name="plus" size={16} color="var(--bg)" />
        </div>
      </div>
    </div>
  );
}

// ─── Beneficios ───────────────────────────────────────────────
function Beneficios() {
  const items: { icon: Parameters<typeof Icon>[0]["name"]; title: string; copy: string }[] = [
    {
      icon: "clock",
      title: "Onboarding en 5 minutos",
      copy: "Creas tu negocio en la app en un toque. Cargás tus servicios, profesionales y horarios. Listo. Estás online.",
    },
    {
      icon: "whatsapp",
      title: "Confirmación por WhatsApp",
      copy: "Cada reserva avisa al cliente y a vos. Sin contestar 'tenés turno?'.",
    },
    {
      icon: "users",
      title: "Multi-profesional",
      copy: "Cada uno con su agenda y color. Sin pisarse, sin doble reserva.",
    },
    {
      icon: "phone",
      title: "Sin app que descargar",
      copy: "Tus clientes abren el link y reservan. Vos podés instalarla como app si querés.",
    },
    {
      icon: "shield",
      title: "Señas por Mercado Pago",
      copy: "Conectás tu cuenta y el cliente paga la seña al reservar. La plata va directo a tu Mercado Pago. Chau turnos fantasma.",
    },
  ];

  return (
    <section className="py-[36px]">
      <Reveal>
        <div className="label-mono mb-[10px]">Lo que hace</div>
        <h2
          className="font-serif text-[28px] leading-[1.1] text-balance"
          style={{ letterSpacing: "-0.5px" }}
        >
          Todo lo que necesitás.<br />
        </h2>
      </Reveal>

      <div className="mt-[20px] flex flex-col gap-[10px]">
        {items.map((b, i) => (
          <Reveal
            key={b.title}
            delay={i * 0.06}
            className="bg-surface border border-line rounded p-[14px] flex gap-[12px]"
          >
            <div
              className="w-[36px] h-[36px] rounded-[10px] bg-line-2 flex items-center justify-center flex-shrink-0"
            >
              <Icon name={b.icon} size={16} color="var(--ink-1)" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold" style={{ letterSpacing: "-0.2px" }}>
                {b.title}
              </div>
              <div className="text-[12px] text-ink-2 mt-[3px] leading-[1.4]">
                {b.copy}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────
function Pricing() {
  return (
    <section className="py-[36px]">
      <Reveal>
        <div className="label-mono mb-[10px]">Precio</div>
        <h2
          className="font-serif text-[28px] leading-[1.1] text-balance"
          style={{ letterSpacing: "-0.5px" }}
        >
          Probás gratis.<br />
          Si no te gusta, te vas.
        </h2>
      </Reveal>

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-[20px] rounded-lg border-2 p-[20px] relative overflow-hidden"
        style={{
          background: "var(--ink-1)",
          color: "var(--bg)",
          borderColor: "var(--ink-1)",
        }}
      >
        <div
          className="absolute top-[12px] right-[12px] font-mono text-[9px] font-semibold uppercase tracking-[0.1em] px-[8px] py-[3px] rounded-full"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          Oferta lanzamiento
        </div>

        <div className="font-mono text-[10px] tracking-[0.06em]" style={{ opacity: 0.6 }}>
          GRATIS HASTA
        </div>
        <div
          className="font-serif text-[56px] leading-[1] mt-[4px]"
          style={{ letterSpacing: "-1.5px" }}
        >
          30 clientes
        </div>
        <div className="text-[12px] mt-[8px]" style={{ opacity: 0.8 }}>
          Después, $20.000 al mes. El precio de una pizza.
        </div>

        <div className="mt-[18px] flex flex-col gap-[8px]">
          {[
            "Sin tarjeta de crédito",
            "Reservas ilimitadas mientras estés en prueba",
            "Todos los profesionales que quieras",
            "Cobro de señas por Mercado Pago",
            "Cancelás cuando quieras",
          ].map((t) => (
            <div key={t} className="flex items-center gap-[8px] text-[12px]">
              <div
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent)" }}
              >
                <Icon name="check" size={11} color="var(--bg)" strokeWidth={3} />
              </div>
              <span style={{ opacity: 0.95 }}>{t}</span>
            </div>
          ))}
        </div>

        <Link href="/onboarding" className="block mt-[20px]" onClick={() => trackStartOnboarding("mid")}>
          <button
            className="w-full h-[48px] rounded text-[14px] font-semibold flex items-center justify-center gap-[6px] press-fx"
            style={{
              background: "var(--bg)",
              color: "var(--ink-1)",
              border: 0,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Crear mi negocio ahora
            <Icon name="forward" size={14} color="var(--ink-1)" />
          </button>
        </Link>
      </motion.div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "¿Necesito tarjeta de crédito para empezar?",
    a: "No. Crear tu cuenta y usar la app hasta los 30 primeros clientes es gratis. No pedimos tarjeta ni datos de pago. ",
  },
  {
    q: "¿Y si no me convence? ¿Quedo atado?",
    a: "No, te vas y listo. No hay permanencia ni cargos sorpresa. Si en la prueba viste que no es para vos, simplemente no seguís.",
  },
  {
    q: "¿Mis clientes tienen que descargar una app?",
    a: "No. Abren tu link desde Instagram, WhatsApp o donde lo pongas, y reservan directamente en el navegador.",
  },
  {
    q: "¿Cuánto tardo en armar mi cuenta?",
    a: "5 minutos. Cargás el nombre del negocio, tus servicios con precios, tu equipo y tus horarios. Apenas terminás, ya tenés tu link público para compartir.",
  },
  {
    q: "¿Puedo tener varios profesionales?",
    a: "Sí. Podés agregar todos los profesionales o sillones que quieras, cada uno con su color, sus horarios y los servicios que ofrece.",
  },
  {
    q: "¿Puedo cobrar seña cuando reservan?",
    a: "Sí. Conectás tu cuenta de Mercado Pago y elegís cuánto pedir: un porcentaje o un monto fijo. El cliente paga al reservar y la plata va directo a tu cuenta. Se acabaron los turnos fantasma.",
  },
  {
    q: "¿Me sirve para controlar los ingresos?",
    a: "Sí. Cada turno queda registrado con su precio, así que ves cuánto entró por día, semana o mes, y cuánto generó cada profesional. Control total de tu negocio, sin planillas.",
  },
  {
    q: "¿Cómo recibo las notificaciones?",
    a: "Te llega push en el navegador o en la app instalada. Tu cliente recibe confirmación por email y WhatsApp.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-[36px]">
      <Reveal>
        <div className="label-mono mb-[10px]">Preguntas frecuentes</div>
        <h2
          className="font-serif text-[28px] leading-[1.1] text-balance"
          style={{ letterSpacing: "-0.5px" }}
        >
          Lo que todos preguntan.
        </h2>
      </Reveal>

      <Reveal delay={0.08} className="mt-[20px] bg-surface border border-line rounded overflow-hidden">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className={i > 0 ? "border-t border-line-2" : ""}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="press-fx w-full flex items-center gap-[10px] px-[16px] py-[14px] text-left"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div className="flex-1 text-[13px] font-medium" style={{ letterSpacing: "-0.2px" }}>
                  {item.q}
                </div>
                <div
                  className="w-[24px] h-[24px] rounded-full bg-line-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    transform: isOpen ? "rotate(45deg)" : "rotate(0)",
                    transition: "transform 0.25s ease",
                  }}
                >
                  <Icon name="plus" size={11} color="var(--ink-1)" />
                </div>
              </button>
              <motion.div
                initial={false}
                animate={{
                  height: isOpen ? "auto" : 0,
                  opacity: isOpen ? 1 : 0,
                }}
                transition={{ duration: 0.25, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <div className="px-[16px] pb-[14px] text-[12px] text-ink-2 leading-[1.5]">
                  {item.a}
                </div>
              </motion.div>
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-[40px] text-center">
      <Reveal>
        <div className="label-mono mb-[14px]">Empezá ahora</div>
        <h2
          className="font-serif text-[36px] leading-[1.05] text-balance"
          style={{ letterSpacing: "-0.8px" }}
        >
          Tu próxima reserva,<br />
          <em className="not-italic" style={{ color: "var(--accent)" }}>
            en piloto automático
          </em>
          .
        </h2>
        <p
          className="mt-[14px] text-[14px] text-ink-2 leading-[1.5] mx-auto"
          style={{ maxWidth: 320 }}
        >
          Probá gratis sin tarjeta. Si no te gusta, listo, te vas. Sin vueltas.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-[28px]">
        <Link href="/onboarding" onClick={() => trackStartOnboarding("final")}>
          <Btn variant="primary" size="lg" full className="gap-2">
            Crear mi negocio
            <Icon name="forward" size={16} color="var(--bg)" />
          </Btn>
        </Link>
        <p className="font-mono text-[11px] text-ink-3 mt-[10px]">
          30 clientes gratis · Sin tarjeta · 5 minutos
        </p>
      </Reveal>

      <div className="mt-[24px]">
        <Link
          href="/login"
          className="text-[13px] text-ink-2 underline underline-offset-4"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="pt-[24px] pb-[8px] text-center">
      <div className="flex items-center justify-center gap-[6px]">
        <BrandMark initials="T" size={20} />
        <span className="font-mono text-[10px] text-ink-3 tracking-[0.06em]">
          TURNO1MIN
        </span>
      </div>
      <div className="font-mono text-[9px] text-ink-3 mt-[8px]">
        Hecho en Argentina · 2026
      </div>
    </footer>
  );
}
