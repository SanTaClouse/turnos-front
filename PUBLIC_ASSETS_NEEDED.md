# Archivos de recursos públicos necesarios para PWA

Los siguientes archivos deben colocarse en `front/turnosapp/public/`:

## Iconos para PWA e iOS

**Solicitá a Claude Design estos archivos específicamente:**

### 1. Iconos estándar (purpose: "any")
- `icon-192.png` - 192×192px, fondo #fafaf7, con logo "Turno1Min"
- `icon-512.png` - 512×512px, fondo #fafaf7, con logo "Turno1Min"

### 2. Iconos Maskable (purpose: "maskable")
**Importante:** Estos deben tener el logo centrado en un círculo equivalente al 80% del canvas, así iOS puede recortar de forma correcta sin perder contenido.
- `icon-192-maskable.png` - 192×192px, logo centrado en círculo
- `icon-512-maskable.png` - 512×512px, logo centrado en círculo

### 3. iOS specific
- `apple-touch-icon.png` - 180×180px (se muestra en pantalla de inicio de iOS)

### 4. Screenshots (opcional pero recomendado)
- `screenshot-1.png` - 540×720px (preview en app store PWA)

## Especificaciones de diseño

- **Paleta de colores:**
  - Fondo: `#fafaf7` (var(--bg) existente)
  - Texto/Logo: `#000000` o usar el accent
  - Fuente: Instrument Serif (la misma que la app)

- **Estilos:**
  - Clean y minimal (match con el branding actual)
  - Logo debe ser reconocible en tamaños pequeños (192px)
  - Sin transparencia en el fondo (solo fondo sólido)

- **Versión maskable especial:**
  - El logo debe estar centrado
  - Dejar espacio alrededor (80% del canvas = 192×0.8 = 153.6px de diámetro del círculo)
  - Esto permite que iOS recorte el icono con seguridad sin perder partes importantes

## Qué está listo

✅ `manifest.json` configurado en `public/manifest.json`
✅ Service Worker (`public/sw.js`)
✅ Hook para detectar instalación (`lib/use-pwa-install.ts`)
✅ Componente de prompt de instalación (`components/ui/pwa-install-prompt.tsx`)
✅ Metadatos de PWA en `app/layout.tsx`
✅ Layout.tsx registra automáticamente el service worker

## Próximos pasos

1. Obtén los iconos de Claude Design
2. Copia los archivos PNG a `front/turnosapp/public/`
3. La PWA estará lista para ser instalada automáticamente en dispositivos

## URLs en Producción

Reemplazar en `.env.local` (o variables de Render):
- `NEXT_PUBLIC_FRONT_SHORT=turno1min.app`
- `NEXT_PUBLIC_API_URL=https://api.turno1min.app`
