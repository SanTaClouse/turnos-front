import Link from "next/link";
import { redirect } from "next/navigation";
import { Btn } from "@/components/ui/btn";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Si ya hay sesión válida, ir directo a la agenda
  const session = await getSession();
  if (session) redirect("/admin/agenda");
  return (
    <div
      className="min-h-screen bg-bg flex flex-col items-center justify-center px-[20px]"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      <div
        className="font-serif text-hero text-center"
        style={{ letterSpacing: "-1px", lineHeight: 1.05 }}
      >
        Turnos para tu negocio, sin complicaciones.
      </div>
      <p
        className="mt-[20px] text-[15px] text-ink-2 text-center leading-[1.5]"
        style={{ maxWidth: 280 }}
      >
        Recibí reservas online. Probalo gratis sin tarjeta.
      </p>
      <div className="mt-[36px] flex flex-col gap-[10px] w-full">
        <Link href="/onboarding" className="w-full">
          <Btn variant="primary" size="lg" full>
            Crear mi negocio
          </Btn>
        </Link>
        <Link href="/login" className="w-full">
          <Btn variant="secondary" size="lg" full>
            Ya tengo cuenta
          </Btn>
        </Link>
      </div>
    </div>
  );
}
