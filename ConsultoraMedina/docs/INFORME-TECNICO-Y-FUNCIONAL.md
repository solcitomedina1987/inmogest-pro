# Informe técnico y funcional — Consultora Medina & Asociados

**Versión del documento:** 1.0 · **Stack:** Next.js 15 · **Repositorio:** aplicación web fullstack (panel + sitio público)

> **Nota sobre PDF:** Este archivo está pensado para exportarse a PDF. Opciones: abrir en VS Code / Cursor y usar una extensión “Markdown PDF”; en macOS, imprimir desde el navegador (vista previa del MD) a PDF; o instalar [Pandoc](https://pandoc.org) y ejecutar:  
> `pandoc docs/INFORME-TECNICO-Y-FUNCIONAL.md -o informe.pdf`

---

## 1. Resumen ejecutivo

La aplicación **Consultora Medina & Asociados** es un sistema web para **gestión inmobiliaria**: catálogo público de propiedades, panel administrativo (propiedades, clientes, proveedores, cobranzas de alquileres, usuarios) y autenticación basada en **Supabase Auth**. El frontend se implementa con **Next.js 15 (App Router)**, **React 19** y **TypeScript**; la persistencia y reglas de acceso recaen en **PostgreSQL** (Supabase) con **Row Level Security (RLS)** y **almacenamiento de archivos** en buckets de Supabase Storage.

---

## 2. Tecnologías principales

| Capa | Tecnología | Uso |
|------|------------|-----|
| Framework UI | **Next.js 15** | Enrutamiento por carpetas (`app/`), layouts anidados, **Server Components**, **Server Actions** (`"use server"`), generación estática/dinámica, optimización de imágenes (`next/image`). |
| Lenguaje | **TypeScript 5** | Tipado en componentes, acciones de servidor y modelos de dominio. |
| Estilos | **Tailwind CSS 4** | Utilidades responsive, diseño del dashboard y del sitio público. |
| Backend datos | **Supabase** | Auth (email/contraseña), PostgreSQL, Storage (fotos de propiedades), políticas RLS. |
| Cliente Supabase SSR | **@supabase/ssr** + **@supabase/supabase-js** | Sesión en cookies; clientes en servidor, middleware y cliente browser. |

---

## 3. Librerías de dependencias y propósito

| Paquete | Rol en el proyecto |
|---------|-------------------|
| **react** / **react-dom** | UI declarativa; hooks en componentes cliente (`"use client"`). |
| **next** | Framework: rutas, metadata SEO, Image, middleware, compilación. |
| **zod** | Esquemas de validación para formularios y **Server Actions** (propiedades, clientes, cobranzas, vendors, admin). |
| **react-hook-form** | Estado de formularios complejos con bajo re-render. |
| **@hookform/resolvers** | Integración `zodResolver` para validar con Zod. |
| **radix-ui** (paquete unificado) + **@radix-ui/react-popover** | Primitivos accesibles: **Dialog**, **Select**, **Popover**, etc. (patrón Shadcn/UI). |
| **class-variance-authority (cva)** | Variantes de estilos en componentes UI (p. ej. `Button`). |
| **clsx** + **tailwind-merge** | Composición de clases CSS (`cn()` en `lib/utils.ts`). |
| **lucide-react** | Iconografía consistente. |
| **sonner** | Toasts de feedback (éxito / error) en operaciones del panel. |
| **date-fns** | Manipulación y formato de fechas donde aplica. |
| **react-day-picker** | Selector de fechas en formularios (p. ej. cobranzas). |
| **embla-carousel-react** | Carrusel táctil de imágenes en cards y detalle público de propiedades. |
| **eslint** + **eslint-config-next** | Lint en CI y `next build`. |

### Herramientas de desarrollo

- **@tailwindcss/postcss**, **tailwindcss**: pipeline CSS.
- **@types/node**, **@types/react**, **@types/react-dom**: tipos TS.

---

## 4. Arquitectura de la aplicación

### 4.1 Estructura de rutas (App Router)

- **`app/layout.tsx`**: layout raíz, fuentes Geist, **metadata** global (título con plantilla `%s | Consultora Medina & Asociados`, Open Graph, Twitter, `metadataBase` opcional vía env).
- **`app/(public)/`**: sitio público sin auth obligatoria (`/`, `/propiedades/[id]`).
- **`app/(auth)/`**: login, registro, recuperación y actualización de contraseña.
- **`app/(dashboard)/dashboard/`**: panel protegido; subrutas por módulo (propiedades, clientes, cobranzas, etc.).
- **`app/auth/callback/route.ts`**: **Route Handler** GET para **PKCE / confirmación de email** de Supabase: intercambia `code` por sesión y redirige; añade `?first_login=true` cuando `type` es verificación de email (`signup` / `email`).
- **`middleware.ts`**: delega en `lib/supabase/middleware.ts` el refresco de sesión y las redirecciones por rol/ruta.

### 4.2 Patrones de implementación

- **Server Components** por defecto en páginas que leen datos con `createClient()` de servidor.
- **Client Components** donde hay estado, eventos o hooks del navegador (formularios, diálogos, carrusel, navegación optimista).
- **Server Actions** (`app/actions/*.ts`) para mutaciones con revalidación (`revalidatePath`).
- **Separación** `lib/validations/*` (Zod), `lib/constants/*`, `lib/cobranzas/*`, `lib/propiedades/*`, `lib/supabase/*`.

---

## 5. Autenticación, sesión y autorización

### 5.1 Flujo de sesión

- Cookies gestionadas por **@supabase/ssr** en **middleware**, **Route Handlers** y **Server Components**.
- **`lib/supabase/middleware.ts`**:
  - Refresca la sesión en cada request coincidente.
  - Sin usuario y ruta `/dashboard/**` → redirect a `/login?redirect=…`.
  - Con usuario en páginas de auth (excepto `/update-password`) → redirect a `/dashboard`.
  - **Rol cliente:** solo puede acceder a la **raíz** `/dashboard`; el resto de subrutas de administración redirigen a `/dashboard?restringido=1`.
  - **Rol admin:** acceso completo al árbol del dashboard.

### 5.2 Registro y verificación

- **Registro público** (`RegisterForm`): `signUp` con `emailRedirectTo` hacia `/auth/callback?next=/dashboard&type=signup`.
- **Alta desde admin** (`crearUsuarioDesdeAdmin`): reenvío de email con el mismo patrón de callback.
- **Modal de bienvenida** en `/dashboard` si `?first_login=true`: cierra con `router.replace("/dashboard")` para no reaparecer al recargar.

### 5.3 Protección en servidor

- Acciones sensibles usan **`requireAdmin()`** (u otras guardas) para ejecutar solo con perfil admin en Supabase.

---

## 6. Modelo de datos (visión aplicada al código)

> El archivo `schema.sql` en el repo es **referencia**; el despliegue real sigue **migraciones** en `supabase/migrations/`. A nivel funcional, el sistema actual incluye entre otros:

- **`perfiles`**: 1:1 con `auth.users`; `rol` (`admin` | `cliente`), nombre, email.
- **`clientes`**: padrón unificado (propietarios, inquilinos, “ambos”) con campos de contacto y tipo.
- **`propiedades`**: ficha de inmueble, estado comercial (alquiler/venta y estados tipo Alquilada/Vendida), relación con propietario e inquilino opcional (`cliente_id`), baja lógica (`is_active`).
- **`propiedades_img`**: URLs ordenadas por `orden`; bucket **Storage** `propiedades`.
- **`contratos_cobranza`**: contrato de alquiler (propiedad, inquilino, locador, fechas, monto mensual, día límite, actualización periódica).
- **`pagos`**: cuotas mensuales por contrato (`mes_periodo` YYYY-MM, `monto_esperado`, `monto_pagado`, `estado` Pendiente/Pagado/Atrasado, forma de pago, observaciones).
- **Proveedores / vendors** y **usuarios admin** según tablas y acciones del módulo correspondiente.

**RLS** y políticas en migraciones restringen lectura/escritura según rol (p. ej. cliente con acceso limitado a resúmenes).

---

## 7. Módulos funcionales y cómo están implementados

### 7.1 Sitio público

- **Página principal** (`app/(public)/page.tsx`): lista propiedades activas vía **`getPublicPropiedadesForHomeAction`**; filtros en cliente (`PublicHomeClient`).
- **Detalle público** (`/propiedades/[id]`): SSR con Supabase; vista con **`PropiedadPreviewContent`**.
- **Componentes**: cabecera, pie, cards con **`PropiedadImagenCarousel`** (Embla + `next/image`), diálogo de detalle en home.
- **Datos**: `lib/data/public-propiedades.ts` (fetch servidor) con galería `imagenes` ordenada.

### 7.2 Propiedades (dashboard)

- **Listado/edición**: `PropiedadesTable`, **`PropiedadFormDialog`** (react-hook-form + Zod).
- **Acciones** (`app/actions/propiedades.ts`): `createProperty` / `updateProperty` (FormData, hasta 10 imágenes, límite 5 MB, subida paralela a Storage, inserción batch en `propiedades_img`), `deleteProperty` (baja lógica).
- **Vista previa** modal para staff con una imagen principal en fila de lista.

### 7.3 Clientes

- **CRUD** vía **`app/actions/clientes.ts`** y UI en `clientes-client.tsx` / formularios dialog.
- Validaciones en `lib/validations` y constantes de tipos de cliente.

### 7.4 Proveedores (vendors)

- **Acciones** `createVendor`, `updateVendor`, `deactivateVendor` en `app/actions/vendors.ts`.
- Listado y formularios en componentes bajo `components/vendors/`.

### 7.5 Cobranzas

- **Contratos**: creación con **`createContratoCobranza`**; generación de **todas las cuotas mensuales** entre `fecha_inicio` y `fecha_vencimiento` en estado Pendiente.
- **Sincronización idempotente** al abrir detalle: `ensurePagosMensualesExistentes` (`lib/cobranzas/sync-pagos-mensuales.ts`) por si faltan filas históricas.
- **Pagos**: **`registrarPagoContrato`** actualiza o inserta según `mes_periodo` derivado de la fecha de pago; **`updateContract`** para montos y vigencia.
- **UI**: listado de contratos, detalle con tabla de cuotas y botón “Registrar pago” por fila (mismo modal que el registro global), recibo imprimible.

### 7.6 Dashboard ejecutivo

- **`getExecutiveDashboardData`** agrega métricas y listados (cobros atrasados, etc.) para paneles según rol.

### 7.7 Administración de usuarios

- **`app/actions/admin-usuarios.ts`**: actualización de perfiles, creación de usuario con servicio (service role donde aplique), reenvío de confirmación con callback unificado.

### 7.8 Contratos (módulo legacy / documentos)

- Ruta **`/dashboard/contratos`**: placeholder o enlaces según evolución del producto (ver código actual).

---

## 8. Configuración y despliegue

- **Variables de entorno típicas:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, URLs del sitio para redirects (`NEXT_PUBLIC_SITE_URL`, `VERCEL_URL` en Vercel).
- **`next.config.ts`**: `images.remotePatterns` para dominios Supabase Storage; **`serverActions.bodySizeLimit`** elevado para subida múltiple de imágenes.
- **Supabase Dashboard**: URL del sitio y **Redirect URLs** deben incluir `https://<dominio>/auth/callback` (y equivalente local en desarrollo).

---

## 9. Calidad y convenciones

- **ESLint** (`eslint.config.mjs`) con reglas Next + TypeScript; exclusiones de artefactos (`.next`, `node_modules`, etc.).
- **Typecheck** integrado en `next build`.
- **Componentes UI** alineados con patrones **Shadcn** (Radix + Tailwind + `cva`).

---

## 10. Conclusión

El proyecto consolida un **producto inmobiliario integral**: exposición pública optimizada para móvil (carruseles, modales accesibles) y **backoffice** para operaciones diarias (altas, cobranzas recurrentes, padrón de personas). La arquitectura prioriza **seguridad** (RLS, middleware por rol), **validación explícita** (Zod) y **experiencia** (feedback con toasts, flujos de primer login y confirmación por email).

---

*Fin del informe.*
