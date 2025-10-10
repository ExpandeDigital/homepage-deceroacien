# Plataforma De Cero a Cien – Documentación Actualizada

## Estado actual (Octubre 2025)
✅ **En producción**: https://deceroacien.app  
✅ **Infraestructura**: Google Cloud (Load Balancer + CDN + Cloud Storage + Cloud Run)  
✅ **CI/CD**: Cloud Build automático en push a `main`  
✅ **Autenticación**: Supabase Auth (Google OAuth)  
✅ **Pagos**: Mercado Pago Checkout Pro certificado  

## Qué es la plataforma
- **Sitio estático modular** (HTML + JavaScript) servido desde Cloud Storage con CDN global
- **Build pipeline automatizado**: `cloudbuild.yaml` genera `dist/` y despliega en cada push
- **API Express única** (`api/server.mjs`) en Cloud Run: gestiona pagos, auth, webhooks y leads
- **Funciones dinámicas**: cabecera/pie automáticos, autenticación Supabase, control de acceso a cursos
- **Accesos locales**: todo se guarda en localStorage y se sincroniza con pagos via API

## Arquitectura actual
- **Cabecera y pie**: `assets/js/components.js` - layout dinámico universal
- **Autenticación**: `assets/js/auth.js` - Supabase Auth con Google OAuth
- **Control de acceso**: `assets/js/entitlements.js` - gating declarativo por compra
- **Precios centralizados**: `assets/config/pricing.json` - fuente única de verdad
- **Pagos certificados**: `assets/js/payments.js` + API `/api/mp/*` - Mercado Pago Checkout Pro
- **Estilos**: Tailwind CSS compilado localmente (no CDN)

## Productos típicos (ejemplos)
- course.pmv – Programa PMV
- course.pmf – Programa PMF
- course.growth – Programa Growth
- course.ceo – Masterclass CEO

## Cómo navega un alumno
1) Visita el sitio y revisa el catálogo (Academy, Masterclass, etc.).
2) Si intenta abrir un material protegido (por ejemplo, Fase 3), el sistema comprueba si tiene acceso.
   - Si NO tiene acceso: aparece un mensaje/CTA para comprar o iniciar sesión.
3) Si compra, tras el pago vuelve al sitio y se otorga el acceso (ver Flujo de Pago).
4) Con acceso, ve el contenido sin bloqueos. Si inicia sesión, además verá su nombre y atajos en el dashboard.

## Control de acceso (Entitlements)
- Auditoría: Shift + G ejecuta auditor rápido de la página actual (estructura de gating). También disponible `GatingAuditor.runDeep()` para escanear todas las fases.
- Los accesos del alumno se guardan en `localStorage` del navegador con la clave `deceroacien_entitlements`.
- `assets/js/gating-auditor.js`: Auditor cliente de páginas protegidas (estructura data-entitlement, bloques granted/denied, orden de scripts, duplicados de badge).
## Autenticación (opcional)
- Se puede entrar con Google (One Tap) o con email simulado. 
- La sesión se guarda localmente (`localStorage`) para recordar al alumno entre visitas.
- La autenticación no es obligatoria para comprar, pero ayuda a personalizar la experiencia.

## Pagos con Mercado Pago (Checkout Pro)
- En el sitio, los botones de "Comprar" llaman a `Payments.startCheckout(...)`.
- La API Express (Cloud Run) crea una preferencia de pago con el SDK oficial de Mercado Pago; los secretos viven como variables de entorno.
- Se envían:
  - Lista de productos (desde `pricing.json`).
  - URL de retorno automática cuando el pago queda aprobado.
  - URL de webhook (notificaciones) para validar eventos.
- El alumno es redirigido a Mercado Pago a pagar.

### Retorno después del pago
- Si el pago se aprueba, Mercado Pago devuelve al alumno a `portal-alumno.html` con un parámetro seguro (`grant` firmado).
- El navegador verifica esa firma llamando al endpoint `/api/mp/verify-grant` expuesto por `api/server.mjs`. Si es válida, otorga el acceso automáticamente.
- Esto evita que alguien se “autorregale” acceso manipulando la URL.

### Webhooks (notificaciones del pago)
- Mercado Pago también envía notificaciones al endpoint `/api/mp/webhook` (servido desde `api/server.mjs`).
- Ese endpoint valida una firma de seguridad y consulta el estado real del pago con el SDK oficial.
- Allí se puede conectar un sistema interno (por ejemplo, una base de datos) para registrar compras de forma persistente. En esta versión, el acceso se gestiona localmente en el navegador y el webhook sólo registra eventos.

## Captura de leads (Descargas gratuitas)
- Los formularios de `descargas-gratuitas.html` envían la información al endpoint `POST /api/leads/downloads` que expone `api/server.mjs`.
- Si hay base de datos (`DATABASE_URL`), los registros se guardan en la tabla `download_leads` con email, fuente, tags y metadatos.
- Sin base de datos, los leads se registran en un archivo NDJSON (`api/_tmp/download-leads.ndjson`) como respaldo.
- Puedes activar un aviso por email configurando `LEADS_NOTIFY_EMAIL` y un transporte SMTP (`SMTP_URL` o `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`).
- El script `assets/js/downloads.js` maneja validaciones, estado del formulario y dispara el evento `lead_download_submitted` a `dataLayer` para analítica.

## Empaquetado y despliegue
- Para preparar el sitio, ejecuta `npm run build:frontend`. Este comando compila Tailwind a `assets/styles/tailwind.css` y genera el artefacto estático en `dist/` listo para subir a un bucket/CDN.
- Publica el contenido de `dist/` en tu hosting estático (Cloud Storage + CDN, por ejemplo).
- Despliega la API Express (`api/server.mjs`) en Cloud Run u otra plataforma Node.js, configurando las variables de entorno (Supabase, Mercado Pago, SMTP, etc.).
- No quedan endpoints ni dependencias de Firebase; toda la lógica del backend vive en este servicio Express centralizado.

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

## Pipeline de despliegue

### Requisitos
- Proyecto activo: `deceroacienfirebase` (Google Cloud). Asegúrate de ejecutar `gcloud auth login` y `gcloud config set project deceroacienfirebase`.
- Bucket estático: `gs://www-deceroacien-app` con Cloud CDN habilitado y conectado al load balancer `lb-deceroacien`.
- Servicio de Cloud Run: `deceroacien-api` (región `us-central1`) usando la imagen `gcr.io/deceroacienfirebase/deceroacien-api`.
- Secret Manager con los secretos listados abajo y acceso otorgado al servicio de Cloud Run y a Cloud Build (`cloud-build@` y `cloud-run-deployer@`).

### Build local rápido
```pwsh
npm install
npm run build:frontend     # compila Tailwind y genera dist/
```
`dist/` queda listo para sincronizarse al bucket. Usa `npm run api:start` para levantar la API local.

### Cloud Build (CI/CD automático)
✅ **Trigger activo**: `deploy-main` ejecuta en cada push a `main`
- **Pipeline completo** en `cloudbuild.yaml`:
  1. `npm ci` - instala dependencias
  2. `npm run build:frontend` - compila Tailwind y genera `dist/`
  3. `gsutil -m rsync -r dist gs://www-deceroacien-app` - deploy frontend
  4. `docker build/push` - construye imagen API
  5. `gcloud run deploy` - actualiza Cloud Run con nuevos secretos
- **Cuenta de servicio**: `cloud-build-runner@deceroacienfirebase.iam.gserviceaccount.com`
- **Deploy manual** (si necesario):
```pwsh
gcloud builds submit --config cloudbuild.yaml .
```

### Deploy manual desde la terminal

**Frontend (sin Cloud Build):**
```pwsh
npm run build:frontend
gsutil -m rsync -r dist gs://www-deceroacien-app
```

**API en Cloud Run:**
```pwsh
docker build -t gcr.io/deceroacienfirebase/deceroacien-api .
docker push gcr.io/deceroacienfirebase/deceroacien-api
gcloud run deploy deceroacien-api `
  --image gcr.io/deceroacienfirebase/deceroacien-api `
  --region us-central1 `
  --allow-unauthenticated `
  --service-account cloud-run-deployer@deceroacienfirebase.iam.gserviceaccount.com `
  --set-secrets "MP_ACCESS_TOKEN=mp-access-token:latest,GRANT_SECRET=grant-secret:latest,PUBLIC_SUPABASE_URL=public-supabase-url:latest,PUBLIC_SUPABASE_ANON_KEY=public-supabase-anon-key:latest,SUPABASE_JWT_SECRET=supabase-jwt-secret:latest,SMTP_HOST=smtp-host:latest,SMTP_PORT=smtp-port:latest,SMTP_USER=smtp-user:latest,SMTP_PASS=smtp-pass:latest"
```

### Secretos requeridos

| Llave env                        | Secreto en Secret Manager        |
|---------------------------------|----------------------------------|
| `MP_ACCESS_TOKEN`               | `mp-access-token`                |
| `GRANT_SECRET`                  | `grant-secret`                   |
| `PUBLIC_SUPABASE_URL`           | `public-supabase-url`            |
| `PUBLIC_SUPABASE_ANON_KEY`      | `public-supabase-anon-key`       |
| `SUPABASE_JWT_SECRET`           | `supabase-jwt-secret`            |
| `SMTP_HOST` / `SMTP_PORT`       | `smtp-host` / `smtp-port`         |
| `SMTP_USER` / `SMTP_PASS`       | `smtp-user` / `smtp-pass`         |

*(Opcional)* Si usas base de datos: `DATABASE_URL` en el secreto `database-url`.

### Operaciones rápidas
- **Estado infraestructura**: `gcloud compute url-maps describe lb-deceroacien --project=deceroacienfirebase`
- **SSL certificados**: `gcloud compute ssl-certificates list --project=deceroacienfirebase`
- **Invalidar CDN**: `gcloud compute url-maps invalidate-cdn-cache lb-deceroacien --path="/*"`
- **Logs de build**: `gcloud builds list --limit=5 --project=deceroacienfirebase`
- **Estado API**: Verificar https://api.deceroacien.app/health
- **Accesos de prueba**: `/portal-alumno.html?grant=course.pmv` (solo desarrollo)

## Qué necesita su equipo para operar
- Cambiar precios o textos: editar HTML/`pricing.json` y volver a ejecutar `npm run build:frontend`.
- Activar/ocultar secciones: usar `data-entitlement` en HTML.
- Configurar pagos: en el panel de Mercado Pago, definir credenciales, webhook y los eventos que enviará.

## Infraestructura actual (Google Cloud)

### Dominios y SSL
- ✅ **deceroacien.app** - Certificado SSL activo, redirige HTTPS
- ✅ **www.deceroacien.app** - Certificado SSL activo  
- ✅ **api.deceroacien.app** - API Cloud Run, certificado SSL activo

### Servicios desplegados
- **Frontend**: Bucket `www-deceroacien-app` + Cloud CDN global
- **Load Balancer**: `lb-deceroacien` con SSL termination y routing
- **API**: Cloud Run `deceroacien-api` (región us-central1)
- **Secrets**: Secret Manager para todas las credenciales
- **DNS**: Cloudflare apuntando a Load Balancer IP `34.36.64.227`

### Certificados SSL
- `cert-deceroacien-complete` - Activo para los 3 dominios
- Auto-renovación gestionada por Google

## Archivos obsoletos eliminados
- ❌ Firebase Functions (migrado a Express API)
- ❌ Firebase Auth (migrado a Supabase)  
- ❌ CDN de Tailwind (compilación local)
- ❌ Configuraciones Firebase (limpieza pendiente)

## Contacto técnico
Para análisis, reportes, base de datos centralizada o panel de administración, contactar al equipo técnico.
