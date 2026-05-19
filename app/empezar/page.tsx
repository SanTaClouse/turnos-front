import type { Metadata } from "next";
import { EmpezarView } from "./empezar-view";

export const metadata: Metadata = {
  title: "Turno1Min — Tu negocio online en 5 minutos",
  description:
    "Recibí reservas online por WhatsApp y web. Primeros 30 clientes gratis, sin tarjeta. Si no te gusta, te vas. Después, $20.000 al mes — el precio de una pizza.",
  openGraph: {
    title: "Tu negocio online en 5 minutos",
    description:
      "Un robot que trabaja por vos las 24hs por el precio de una pizza. Primeros 30 clientes gratis.",
    type: "website",
  },
};

export default function EmpezarPage() {
  return <EmpezarView />;
}
