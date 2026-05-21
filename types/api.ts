export interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsapp_number: string;
  email?: string | null;
  country_code?: string;
  timezone: string;
  currency: string;
  locale: string;
  description: string | null;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
  /** Solo presente en la respuesta de POST /tenants si se envió email. */
  session_token?: string;
}

export interface AdminSession {
  id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface AdminMe {
  tenant: Pick<
    Tenant,
    | "id"
    | "name"
    | "slug"
    | "email"
    | "whatsapp_number"
    | "timezone"
    | "currency"
    | "locale"
  >;
  session: AdminSession;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  price: number | null;
  is_active: boolean;
  tenant_id: string;
}

export interface Resource {
  id: string;
  name: string;
  role: string | null;
  hue: number;
  is_active: boolean;
  tenant_id: string;
  services?: Service[];
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  picture: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled";
  source: "whatsapp" | "web" | "manual";
  notes: string | null;
  /** Precio efectivamente cobrado. Si está, sobreescribe service.price para
   *  el cálculo de ganancias. null = usar precio del servicio. */
  price_override: number | string | null;
  /** Sobre-turno creado por el admin fuera del slot grid normal. */
  is_overbooking: boolean;
  created_at: string;
  tenant_id: string;
  client_id: string | null;
  service_id: string | null;
  resource_id: string | null;
  client?: Client;
  service?: Service;
  resource?: Resource;
}

export interface AvailableSlot {
  slot: string;
  resource_ids: string[];
}

export interface Availability {
  id: string;
  day_of_week: number;     // 0 = domingo, 6 = sábado
  start_time: string;      // HH:MM
  end_time: string;        // HH:MM
  slot_duration: number;   // minutos
  tenant_id: string;
  resource_id: string;
}

export interface BlockedSlot {
  id: string;
  date: string;            // YYYY-MM-DD (inicio)
  end_date: string | null; // YYYY-MM-DD (fin) — null = un solo día
  start_time: string | null; // HH:MM — null = día completo
  end_time: string | null;   // HH:MM — null = día completo
  reason: string | null;
  tenant_id: string;
  resource_id: string | null; // null = bloquea TODOS los recursos
}

// ──────────── Earnings ────────────

export type EarningsPeriod = "dia" | "semana" | "mes";

export interface EarningsResult {
  period: EarningsPeriod;
  label: string;
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  total: number;
  prev: number;
  breakdown: number[];
  labels: string[];
  services: Array<{
    service_id: string | null;
    name: string;
    count: number;
    total: number;
  }>;
  pros: Array<{
    resource_id: string | null;
    name: string;
    hue: number;
    count: number;
    total: number;
  }>;
}

// ──────────── Exports ────────────

export interface ExportLogSummary {
  id: string;
  range_from: string;
  range_to: string;
  status_filter: string;
  row_count: number;
  created_at: string;
  exported_by: string | null;
}

export interface ExportPreview {
  rowCount: number;
  totalRevenue: number;
  hash: string;
  duplicates: {
    exactRange: ExportLogSummary | null;
    exactRows: ExportLogSummary | null;
    overlappingRanges: ExportLogSummary[];
  };
}

// ──────────── AI Summaries ────────────

export interface SummaryInsight {
  kind:
    | "top_resource"
    | "top_service"
    | "best_day"
    | "worst_day"
    | "loyal_clients"
    | "top_hour";
  icon: string;
  accent: string;
  accentBg: string;
  title: string;
  body: string;
}

export interface MonthlySummary {
  id: string;
  tenant_id: string;
  month: string; // YYYY-MM
  hero: {
    revenue: number;
    prev_revenue: number | null;
    delta_pct: number | null;
    appointments: number;
  };
  insights: SummaryInsight[];
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  generated_at: string;
}
