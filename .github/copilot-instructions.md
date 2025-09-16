# Instrucciones para agentes de IA en homepage-deceroacien

Objetivo: maximizar productividad inmediata en este repo. Este es un sitio estático modular (HTML + JS Vanilla + Tailwind CDN) con autenticación en cliente y gating por entitlements en localStorage. No hay build ni backend aquí.

## Arquitectura esencial
- Layout/UI
  - `assets/js/components.js`: orquesta header/footer dinámicos, inyecta estilos (`assets/styles/*`), detecta `basePath` según `src` para que los enlaces funcionen desde subcarpetas (auth, conecta, etc.). Expone `AppManager` y utilidades.
  - `assets/templates/base.html`: patrón de estructura con SEO/meta y carga estándar de scripts.
- Autenticación (cliente)
  - `assets/js/config-secure.js`: declara `window.PublicAuthConfig` y `Environment`; oculta el Google Client ID (base64). Endpoints de API son placeholders.
  - `assets/js/auth.js`: `AuthManager` maneja login/registro simulados, sesión en localStorage y Google Identity Services (GIS). Expone `requireAuth()` y `redirectIfAuthenticated()`.
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
  - `auth/*.html` carga `https://accounts.google.com/gsi/client?hl=es` y llama `handleCredentialResponse` definido en `auth.js` → `decodeJwtResponse` → guarda sesión en localStorage → `redirectAfterAuth()` hacia `auth/dashboard.html`.
- Protección de página:
  - En páginas privadas, llamar `requireAuth()` tras `DOMContentLoaded`; si no hay sesión, redirige a `auth/login.html?return=<url>`.
- Acceso a cursos/herramientas:
  - En `portal-alumno.html` y `fase_*_ecd/` se usa `data-entitlement` para mostrar contenido o CTA. También puedes simular compra con `?grant=course.pmv` o desde consola: `paymentEntitlements.grantAfterCheckout({ items: ['course.pmv'] })`.

## Qué está listo vs. pendiente
- Listo (cliente): layout dinámico, navegación, estilos, auth simulada, GIS client-side, gating por entitlements, overlay de auto-guard, portal/catálogos.
- Parcial: dashboard con datos locales; formularios con `action="#"`; comunidad/juegos mayormente informativos.
- Faltante: backend real (verificación GIS, refresh, endpoints), integración de pagos y webhook/return para otorgar entitlements.

## Patrones y ejemplos en el repo
- `academy.html`: tarjetas con `data-entitlement` + `[data-when]` y CTAs.
- `auth/dashboard.html`: ejemplo de `requireAuth()` y uso de datos del usuario en UI.
- `portal-alumno.html`: acordeones por curso con `data-entitlement` y grid de herramientas.

## Recomendaciones prácticas para contribuir
- Nuevas páginas: importa `components.js` siempre; si requiere login o acceso, añade `auth.js`/`entitlements.js` y llama `requireAuth()`.
- Rutas: usa enlaces relativos; `components.js` ajusta `basePath` automáticamente.
- Simulación: usa `?grant=` para probar flujos de compra/acceso sin backend.

Para dudas o mejoras, consulta `docs/flujo-plataforma.md` (mermaid con el flujo completo) y abre PRs incrementales enfocados.
