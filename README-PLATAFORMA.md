# Plataforma De Cero a Cien – Guía para Clientes

Esta guía explica, en lenguaje simple, cómo funciona la plataforma web: qué hace cada parte, cómo se gestionan accesos (entitlements), autenticación, pagos con Mercado Pago y el flujo completo de un alumno.

## Qué es la plataforma
- Sitio estático modular (HTML + JavaScript) sin backend propio. 
- Funciones dinámicas en el navegador: cabecera/pie automáticos, autenticación básica, control de acceso a cursos, y compra con Mercado Pago.
- Todo lo importante (accesos, sesión) se guarda en el dispositivo del usuario (navegador) y se puede sincronizar con el pago.

## Piezas principales
- Cabecera y pie: se generan con `assets/js/components.js` en todas las páginas.
- Autenticación (opcional): `assets/js/auth.js` permite login simulado y con Google (GIS). 
- Accesos por compra (entitlements): `assets/js/entitlements.js` controla qué se muestra según la compra del alumno.
- Precios: `assets/config/pricing.json` centraliza los precios y nombres de los productos.
- Pagos: `assets/js/payments.js` + endpoints `/api/mp/*` integran Mercado Pago Checkout Pro.

## Productos típicos (ejemplos)
- course.pmv – Bootcamp PMV
- course.pmf – Bootcamp PMF
- course.growth – Bootcamp Growth
- course.ceo – Masterclass CEO

## Cómo navega un alumno
1) Visita el sitio y revisa el catálogo (Academy, Masterclass, etc.).
2) Si intenta abrir un material protegido (por ejemplo, Fase 3), el sistema comprueba si tiene acceso.
   - Si NO tiene acceso: aparece un mensaje/CTA para comprar o iniciar sesión.
3) Si compra, tras el pago vuelve al sitio y se otorga el acceso (ver Flujo de Pago).
4) Con acceso, ve el contenido sin bloqueos. Si inicia sesión, además verá su nombre y atajos en el dashboard.

## Control de acceso (Entitlements)
- Cada bloque de contenido privado lleva una etiqueta `data-entitlement` en el HTML.
- El script `entitlements.js` revisa si el alumno tiene los permisos para ver cada bloque.
- Si no, muestra una llamada a la acción (CTA) para comprar o iniciar sesión.
- Los accesos del alumno se guardan en `localStorage` del navegador con la clave `deceroacien_entitlements`.

## Autenticación (opcional)
- Se puede entrar con Google (One Tap) o con email simulado. 
- La sesión se guarda localmente (`localStorage`) para recordar al alumno entre visitas.
- La autenticación no es obligatoria para comprar, pero ayuda a personalizar la experiencia.

## Pagos con Mercado Pago (Checkout Pro)
- En el sitio, los botones de "Comprar" llaman a `Payments.startCheckout(...)`.
- El servidor (sin guardar secretos en el frontend) crea una preferencia de pago con el SDK oficial de Mercado Pago.
- Se envían:
  - Lista de productos (desde `pricing.json`).
  - URL de retorno automática cuando el pago queda aprobado.
  - URL de webhook (notificaciones) para validar eventos.
- El alumno es redirigido a Mercado Pago a pagar.

### Retorno después del pago
- Si el pago se aprueba, Mercado Pago devuelve al alumno a `portal-alumno.html` con un parámetro seguro (`grant` firmado).
- El navegador verifica esa firma (endpoint `/api/mp/verify-grant`) y, si es válida, otorga el acceso automáticamente.
- Esto evita que alguien se “autorregale” acceso manipulando la URL.

### Webhooks (notificaciones del pago)
- Mercado Pago también envía notificaciones al endpoint `/api/mp/webhook`.
- Ese endpoint valida una firma de seguridad y consulta el estado real del pago con el SDK oficial.
- Allí se puede conectar un sistema interno (por ejemplo, una base de datos) para registrar compras de forma persistente. En esta versión, el acceso se gestiona localmente en el navegador y el webhook sólo registra eventos.

## Edición de contenidos y precios
- Páginas y secciones se editan como HTML. 
- Los precios se cambian en `assets/config/pricing.json` (un solo lugar) y se reflejan automáticamente en la web y al crear las preferencias de pago.

## Preguntas frecuentes
- ¿Necesitamos un servidor? No para el sitio en sí. Solo usamos funciones serverless para pagos (crear preferencia, recibir webhook, verificar firma).
- ¿Qué pasa si el alumno borra datos del navegador? Perdería los accesos locales. Recomendación: después del pago, iniciar sesión con Google para tener referencia (email) y reemitir accesos si fuese necesario.
- ¿Se puede llevar un registro centralizado? Sí, conectando el webhook a una base de datos para guardar quién compró qué y restaurar accesos.
- ¿Puedo probar sin pagar? En desarrollo, existe `?grant=course.pmv` y similares para simular accesos. En producción está protegido con firma.

## Seguridad en pocas palabras
- Los secretos (tokens) viven como variables de entorno del hosting; no están en el código público.
- Los retornos de compra llevan firma HMAC, verificada en el servidor antes de otorgar acceso.
- El webhook también verifica firma de Mercado Pago y consulta el estado por SDK.

## Qué necesita su equipo para operar
- Cambiar precios o textos: editar HTML/`pricing.json`.
- Activar/ocultar secciones: usar `data-entitlement` en HTML.
- Configurar pagos: en el panel de Mercado Pago, definir credenciales, webhook y los eventos que enviará.

## Contacto
Si su equipo requiere analíticas, reportes o registro centralizado de alumnos, podemos extender la integración para almacenar las compras en una base de datos y ofrecer un panel de administración.
