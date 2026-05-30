import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BillingSuccessView } from "./success-view";

export const dynamic = "force-dynamic";

export default async function BillingSuccessPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <BillingSuccessView />;
}
