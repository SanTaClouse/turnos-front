const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Wrapper de fetch.
 *
 * IMPORTANTE — Content-Type sólo se manda en requests con body (POST/PATCH/PUT).
 * Mandarlo en GET/DELETE convierte la request en "non-simple" según CORS y dispara
 * un OPTIONS preflight, que sobre Render agrega 250-680ms a CADA llamada. Sin
 * preflight, los GETs son ~50% más rápidos.
 */
async function request<T>(
  path: string,
  options?: RequestInit & { hasBody?: boolean },
): Promise<T> {
  const { hasBody, headers: extraHeaders, ...rest } = options ?? {};
  const headers: Record<string, string> = { ...(extraHeaders as Record<string, string> | undefined) };
  if (hasBody) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store", // siempre datos frescos — sin cache de Next.js
    ...rest,
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), hasBody: true }),
  patch:  <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), hasBody: true }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
