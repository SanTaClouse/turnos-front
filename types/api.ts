export interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsapp_number: string;
  timezone: string;
  currency: string;
  locale: string;
  description: string | null;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
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
