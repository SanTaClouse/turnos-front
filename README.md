# Turno1Min - Frontend

Frontend app para sistema de reserva de turnos online. Construido con Next.js y React.

## Características

- 📅 Reserva de turnos interactiva
- 🌍 Soporte multi-país (código de país configurable)
- 📱 PWA installable con soporte iOS
- 🎨 Diseño responsive y accesible
- 🔔 Confirmaciones por WhatsApp
- 📧 Confirmaciones por email
- 🗂️ Panel de administración

## Desarrollo

### Requisitos

- Node.js 18+
- npm o yarn

### Instalación

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001) en tu navegador.

### Variables de entorno

Copiar `.env.local.example` a `.env.local` y actualizar:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Frontend URL (para PWA)
NEXT_PUBLIC_FRONT_SHORT=localhost:3001

# Admin tenant ID
NEXT_PUBLIC_ADMIN_TENANT_ID=<uuid>
```

## Estructura

```
app/
├── [slug]/              # Rutas públicas por slug de negocio
│   ├── page.tsx         # Landing del negocio
│   ├── mi-turno/        # Gestión de turnos personales
│   └── reservar/        # Flow de reserva
├── admin/               # Dashboard administrativo
│   ├── agenda/
│   ├── servicios/
│   ├── recursos/
│   ├── clientes/
│   └── ajustes/
├── onboarding/          # Setup inicial del negocio
└── layout.tsx           # Root layout con PWA

components/
├── ui/                  # Componentes reutilizables
└── admin/               # Componentes para admin

store/
├── booking.ts           # Estado de reserva (Zustand)
├── admin.ts             # Estado admin (Zustand)
└── onboarding.ts        # Estado onboarding (Zustand)

public/
├── manifest.json        # PWA manifest
├── sw.js                # Service Worker
└── icon-*.png           # Iconos (ver PUBLIC_ASSETS_NEEDED.md)
```

## PWA (Progressive Web App)

La app es installable en dispositivos móviles como PWA.

Para que funcione completamente se necesitan:
- Iconos en `public/` (ver [PUBLIC_ASSETS_NEEDED.md](./PUBLIC_ASSETS_NEEDED.md))
- Service Worker está en `public/sw.js`

### Features de PWA

- Instalación automática en pantalla de inicio
- Soporte iOS (con apple-touch-icon)
- Acceso offline (caché básica)
- Install prompt nativo

## Cambios recientes (Abril 2026)

✅ Renombrado "TurnosApp" → "Turno1Min"
✅ Configuración multi-país para código de teléfono
✅ PWA setup completo con manifest y service worker
✅ Mensaje de screenshot en confirmación de reserva
✅ Variables de entorno para producción (turno1min.app)
✅ Componente PWAInstallPrompt para promover instalación

## Deploy en Producción

### Variables de Render

En tu proyecto de Render, configurar:

```env
NEXT_PUBLIC_API_URL=https://api.turno1min.app
NEXT_PUBLIC_FRONT_SHORT=turno1min.app
NEXT_PUBLIC_ADMIN_TENANT_ID=<uuid>
```

El Service Worker se sirve automáticamente desde `public/sw.js`.

## Next.js

Este es un proyecto de [Next.js](https://nextjs.org) bootstrapped con [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Para aprender más: [Next.js Documentation](https://nextjs.org/docs)
