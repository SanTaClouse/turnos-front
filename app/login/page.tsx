import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginView } from "./login-view";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Si ya hay sesión válida, no mostrar login — derecho a la agenda
  const session = await getSession();
  if (session) redirect("/admin/agenda");
  return <LoginView />;
}
