import { getPlatformTenants } from "./actions";
import { PlatformLogin } from "./platform-login";
import { PlatformView } from "./platform-view";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const tenants = await getPlatformTenants();

  // Sin cookie válida → pantalla de clave. Con sesión → panel de gestión.
  if (!tenants) return <PlatformLogin />;
  return <PlatformView tenants={tenants} />;
}
