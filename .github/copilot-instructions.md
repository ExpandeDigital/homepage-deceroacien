# Instrucciones para agentes de IA en homepage-deceroacien

Objetivo: maximizar productividad inmediata en este repo. Este es un sitio estático modular (HTML + JS Vanilla + Tailwind CDN) con autenticación en cliente y gating por entitlements en localStorage. No hay build ni backend aquí.

## Arquitectura esencial
- Layout/UI
  - `assets/js/components.js`: orquesta header/footer dinámicos, inyecta estilos (`assets/styles/*`), detecta `basePath` según `src` para que los enlaces funcionen desde subcarpetas (auth, conecta, etc.). Expone `AppManager` y utilidades.
  - `assets/templates/base.html`: patrón de estructura con SEO/meta y carga estándar de scripts.
- Autenticación (cliente)
  - `assets/js/config-secure.js`: declara `window.PublicAuthConfig` y `Environment`; oculta el Google Client ID (base64). Endpoints de API son placeholders.
  - `assets/js/auth.js`: `AuthManager` maneja login/registro simulados y sesión en localStorage usando Supabase Auth (Google OAuth). Expone `requireAuth()` y `redirectIfAuthenticated()`.
  - Páginas: `auth/login.html`, `auth/register.html`, `auth/dashboard.html`.
- Entitlements (acceso por compra)
  - `assets/js/entitlements.js`: gating declarativo con `data-entitlement`, bloques `[data-when="granted"]` / `[data-when="denied"]`, CTAs por defecto/override, `?grant=...` y auto-guard por carpeta (`/fase_*_ecd/`). Stub `paymentEntitlements.grantAfterCheckout()`.
- Áreas
  - Marketing: `index.html`, `servicios.html`, `metodologia.html`, `blog.html`, etc.
  - Academy/cursos: `academy.html`, `bootcamp_*.html`, `masterclass_ceo.html` (CTAs según entitlements).
  - Portal alumno: `portal-alumno.html`, y herramientas en `fase_1_ecd/` ... `fase_5_ecd/`.
  - Comunidad/juegos: `conecta/*.html`, `gamificacion/`.

## Convenciones del repo
- Siempre incluir `assets/js/components.js` al final. Agregar `assets/js/auth.js` en páginas con lógica de sesión y `assets/js/entitlements.js` donde haya gating o rutas protegidas.
- Gating en HTML:
  - `<section data-entitlement="course.pmv">` con hijos opcionales `[data-when="granted"]` y `[data-when="denied"]`.
  - Personaliza CTA con `data-cta-override` y `data-cta-label`.
- Auto-guard por ruta: visitar `/fase_*_ecd/` sin entitlement muestra overlay de CTA sin destruir el DOM original.
- Auth en cliente: `localStorage` usa claves `deceroacien_user`, `deceroacien_token`, `deceroacien_session`.
- Entitlements en cliente: `deceroacien_entitlements` (array) y `deceroacien_entitlements_updated` (broadcast entre pestañas).

## Flujos críticos (cómo se usa)
- Login con Google:
  - `auth/*.html` usa Supabase Auth (Google OAuth) vía `@supabase/supabase-js` y guarda sesión en localStorage. Tras login exitoso, redirige a `auth/dashboard.html`.
- Protección de página:
  - En páginas privadas, llamar `requireAuth()` tras `DOMContentLoaded`; si no hay sesión, redirige a `auth/login.html?return=<url>`.
- Acceso a cursos/herramientas:
  - En `portal-alumno.html` y `fase_*_ecd/` se usa `data-entitlement` para mostrar contenido o CTA. También puedes simular compra con `?grant=course.pmv` o desde consola: `paymentEntitlements.grantAfterCheckout({ items: ['course.pmv'] })`.

## Qué está listo vs. pendiente
- Listo (cliente): layout dinámico, navegación, estilos, auth simulada con Supabase, gating por entitlements, overlay de auto-guard, portal/catálogos.
- Parcial: dashboard con datos locales; formularios con `action="#"`; comunidad/juegos mayormente informativos.
- Faltante: backend real (refresh de sesión, endpoints avanzados), integración de pagos y webhook/return para otorgar entitlements.

## Patrones y ejemplos en el repo
- `academy.html`: tarjetas con `data-entitlement` + `[data-when]` y CTAs.
- `auth/dashboard.html`: ejemplo de `requireAuth()` y uso de datos del usuario en UI.
- `portal-alumno.html`: acordeones por curso con `data-entitlement` y grid de herramientas.

## Recomendaciones prácticas para contribuir
- Nuevas páginas: importa `components.js` siempre; si requiere login o acceso, añade `auth.js`/`entitlements.js` y llama `requireAuth()`.
- Rutas: usa enlaces relativos; `components.js` ajusta `basePath` automáticamente.
- Simulación: usa `?grant=` para probar flujos de compra/acceso sin backend.

Para dudas o mejoras, consulta `docs/flujo-plataforma.md` (mermaid con el flujo completo) y abre PRs incrementales enfocados.

---

## Actualización 2025-10-01 — Pagos en producción (Mercado Pago Checkout Pro)

- Frontend
  - Usa `assets/js/payments.js` y `assets/js/pricing.js` en páginas de pago.
  - En dominios `deceroacien.app` se redirige a `init_point` (producción). En desarrollo/sandbox se prioriza `sandbox_init_point`.
  - Inicia pago con `Payments.startCheckout({ items: [...] })`. Si pasas SKUs (strings), `Pricing` normaliza a ítems completos.

- Backend (API Express en `api/` desplegada en Cloud Run)
  - Endpoints clave:
    - `POST /api/mp/create-preference`: crea preferencias y cumple requisitos de certificación. Fallback robusto: SDK con/sin `x-integrator-id` → REST con/sin `x-integrator-id`.
    - `POST /api/mp/webhook`: maneja `topic=payment` y `merchant_order`. Lee el pago por SDK o REST con `Authorization: Bearer <MP_ACCESS_TOKEN>`. Otorga accesos al estar `status=approved`.
  - `GET /api/public-config`: entrega configuración pública (Supabase + URLs) para no exponer claves en el frontend.
    - Debug: `GET /api/mp/debug-whoami`, `GET /api/mp/debug-preference?pref_id=...`.
  - Variables de entorno (mínimas):
    - `MP_ACCESS_TOKEN`, `MP_INTEGRATOR_ID`, `MP_CERT_EMAIL`
    - `MP_INSTALLMENTS`, `MP_EXCLUDE_PAYMENT_METHODS`
    - `PUBLIC_API_BASE`, `PUBLIC_SITE_BASE`, `ALLOWED_ORIGINS`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `GRANT_SECRET`
  - Requisitos de certificación cubiertos: integrator id, `back_urls` + `auto_return`, `external_reference` (email), imagen/desc/ID 4 dígitos, cuotas, exclusión de métodos y webhook.

- Seguridad y configuración
  - No hardcodear claves en el frontend; consumir `GET /api/public-config`.
  - Mantener `ALLOWED_ORIGINS` en `http://localhost:3000, https://deceroacien.app, https://www.deceroacien.app`.
  - Incluir `assets/config/pricing.json` en la imagen (ajustado `.dockerignore` y `Dockerfile`).

## Roadmap priorizado hacia producto completo

### Prioridad 1 — MVP operable sólido
- Idempotencia en webhook (tabla `processed_payments`) y conciliación diaria.
- Modelo de datos mínimo: `users`, `products`, `orders`, `payments`, `enrollments`, `webhook_events`, `audit_log`.
- Panel interno de operaciones: buscar por email/pedido, ver estado, re-otorgar/revocar acceso.
- Emails transaccionales (aprobado/pendiente/fallido) con plantillas.
- Seguridad: secretos en Secret Manager, CSP básica, rate limiting, rotación de tokens.
- Observabilidad: métricas por endpoint y alertas (errores 5xx/webhook).

### Prioridad 2 — UX y autoservicio
- Centro de cuenta: perfil, historial, accesos activos, descarga de recibos.
- Onboarding post-compra (página de primeros pasos + serie de emails).
- Gestión de catálogo desde backend; pricing como única fuente de verdad.
- UX checkout: página de selección de plan/SKU y botón de reintento para pendientes.

### Prioridad 3 — Administración/finanzas
- Integración DTE (boletas/facturas) al aprobar pago.
- Reembolsos/contracargos: flujo operativo y revocación de accesos.
- (Opcional) Suscripciones: preapproval, alta/baja, reintentos, prorrateos.

### Prioridad 4 — Valor de producto/contenido
- Portal del alumno robusto: progreso, certificados, contenidos protegidos (Vimeo/Mux), gamificación.
- Comunidad: roles automáticos en Discord/Slack/foro, rankings/reto por cohortes.
- CMS headless para marketing/blog y flujo editorial.

### Prioridad 5 — Growth y analítica
- Eventos unificados: viewed product, started checkout, payment approved, granted access → GA4/ads + data lake.
- Recuperación de abandono: detección de pending/failed y nudges (email/WhatsApp).

## Informes internos (PDF)
- Generación de PDFs desde HTML con Puppeteer: `npm run reports:pdf`.
- Archivos: `reports/pdf/informe-tecnico.pdf` y `reports/pdf/informe-no-tecnico.pdf`.
- `reports/pdf/` está en `.gitignore` (uso interno, no público).


## Integración actual: Supabase Auth + Postgres (via Supabase)

- Autenticación
  - Frontend: Supabase Auth (Google OAuth) usando `@supabase/supabase-js` y sesión en localStorage. No se usa GIS ni Firebase.
  - Backend: Verificación de JWT Supabase (HS256/JWKS) en `/api/auth/verify` y `/api/auth/me`, provisioning en tabla `users`.
  - Variables mínimas: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`.

- Base de datos (Supabase como Postgres)
  - El backend usa `pg` con `DATABASE_URL`. Puedes apuntarlo a Supabase sin cambios de código (por ejemplo: `postgresql://...@aws-1-us-east-2.pooler.supabase.com:6543/postgres`).
  - SSL: por defecto se usa SSL con `rejectUnauthorized: false`. Puedes forzar o desactivar con `PGSSL=disable` (no recomendado). Si tu cadena incluye `sslmode=require`, también funciona.
  - Al iniciar, el API emite en logs: `[api] Pool PG inicializado` y `[api] Esquema aplicado/validado`.

- Entitlements/Webhook MP: se mantienen igual (insertan en `enrollments`).

### Nota de migración desde versiones previas
- Elimina cualquier variable `PUBLIC_FIREBASE_*` y credencial Firebase de tu entorno.
- Si existe la columna `firebase_uid` en la tabla `users`, puedes borrarla:
  ```sql
  ALTER TABLE users DROP COLUMN IF EXISTS firebase_uid;
  ```
- Verifica que los endpoints `/api/public-config`, `/auth/verify` y `/auth/me` solo usen Supabase.
- El frontend no debe cargar scripts GIS ni Firebase.

