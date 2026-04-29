// Configuración centralizada de la app

export const config = {
  // Frontend URL
  frontendUrl: process.env.NEXT_PUBLIC_FRONT_SHORT
    ? `https://${process.env.NEXT_PUBLIC_FRONT_SHORT}`
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3001",

  // Backend API
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",

  // Admin Tenant ID
  adminTenantId: process.env.NEXT_PUBLIC_ADMIN_TENANT_ID || "",
};

// Para obtener solo el dominio corto (ej: turno1min.app)
export function getFrontendDomain() {
  return process.env.NEXT_PUBLIC_FRONT_SHORT || "localhost:3001";
}

// Para obtener la URL completa del frontend
export function getFrontendUrl() {
  return config.frontendUrl;
}
