# Integración Mercado Pago (Checkout Pro)

Esta carpeta contiene endpoints serverless para crear preferencias de pago y recibir webhooks sin exponer credenciales en el frontend.

## Endpoints

- `POST /api/mp/create-preference` → Crea una preferencia y devuelve `init_point`.
- `POST /api/mp/webhook` → Recibe notificaciones de pago; valida detalles con la API de MP.

## Variables de entorno (configurarlas en el proveedor: Vercel, Netlify, etc.)

- `MP_ACCESS_TOKEN` → Access Token de Mercado Pago (Prueba o Producción).
- `MP_BASE_URL` → URL pública del sitio (e.g. `https://deceroacien.app`). Se usa para `back_urls` y `notification_url`.

Nunca subas estas credenciales al repositorio ni las hardcodees.

## Flujo de PoC (rápido)

1. El frontend (archivo `assets/js/payments.js`) llama a `/api/mp/create-preference` con `items: ['course.pmv']`.
2. Se redirige al checkout (URL `init_point`).
3. En caso de pago aprobado, Mercado Pago redirige a `.../portal-alumno.html?grant=course.pmv`.
4. El script `assets/js/entitlements.js` detecta `?grant=` y otorga acceso en `localStorage`.

## Webhook

El endpoint `/api/mp/webhook` recibe eventos y consulta la API de MP para validar pagos. Aquí puedes integrar la concesión de entitlements en tu base de datos real (pendiente en este repo).

## Notas

- Los precios y monedas en `create-preference.js` están configurados para CLP y deben ajustarse a tu oferta real.
- Para producción, usa credenciales de producción en las variables de entorno del proveedor.
