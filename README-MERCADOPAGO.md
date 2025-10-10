# ⚠️ ARCHIVO OBSOLETO - README-MERCADOPAGO.md

**Estado**: Esta documentación está parcialmente desactualizada tras la migración a Cloud.  
**Usar en su lugar**: [README-PLATAFORMA.md](./README-PLATAFORMA.md) sección de Pagos  

---

# Mercado Pago – Guía de Integración (LEGACY)

⚠️ Esta guía explica la integración anterior. La implementación actual está documentada en README-PLATAFORMA.md

## Qué incluye el repo

- Frontend:
  - `assets/js/entitlements.js` → gating en cliente; soporta `?grant=sku`.
  - `assets/js/payments.js` → `Payments.startCheckout({ items: [...] })`.
  - CTAs conectados en `academy-fases/bootcamp-pmv.html` (Programa PMV).
- Backend serverless (Vercel-style):
  - `api/mp/create-preference.js` → crea preferencia y devuelve `init_point`.
  - `api/mp/webhook.js` → recibe notificaciones y valida pagos.

## Variables de entorno (OBLIGATORIAS)

Configúralas solo en tu proveedor de despliegue (no en el repo):

- `MP_ACCESS_TOKEN` → Access Token de Mercado Pago (usa Sandbox o Producción según entorno).
- `MP_BASE_URL` → URL pública base, p.ej. `https://deceroacien.app`.

## Cómo probar en Sandbox

1. En el proveedor (Vercel/Netlify) setea `MP_ACCESS_TOKEN` con la credencial de prueba.
2. Asegura `MP_BASE_URL` (por ejemplo, la URL preview o dominio de dev si está publicado con HTTPS).
3. Abre `academy-fases/bootcamp-pmv.html` (Programa PMV) y usa los botones “Inscríbete…”.
4. En el success, volverás a `/portal-alumno.html?grant=course.pmv`. El script otorga acceso en `localStorage`.

## Producción

1. Cambia `MP_ACCESS_TOKEN` por el de Producción.
2. Ajusta precios/monedas en `api/mp/create-preference.js`.
3. Considera reemplazar el retorno con `?grant=` por un flujo con webhook + sesión real.

## Seguridad

- Nunca subas claves al repo.
- El `Access Token` vive en variables de entorno. El frontend solo llama a `/api/mp/...`.
- El webhook valida pagos con la API oficial.
