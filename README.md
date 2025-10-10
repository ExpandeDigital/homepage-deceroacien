# De Cero a Cien - Homepage & Plataforma

🚀 **En producción**: https://deceroacien.app

## Estado del proyecto (Octubre 2025)

✅ **Funcionando en producción**  
✅ **Infraestructura Cloud completamente migrada**  
✅ **CI/CD automatizado**  
✅ **SSL certificados activos**  
✅ **Pagos Mercado Pago certificados**  

## Arquitectura actual

### Frontend
- Sitio estático modular (HTML + JS + Tailwind CSS)
- Servido desde Google Cloud Storage + CDN global
- Build automatizado con Cloud Build en cada push a `main`

### Backend
- API Express única en Cloud Run (`api/server.mjs`)
- Autenticación: Supabase Auth (Google OAuth)
- Pagos: Mercado Pago Checkout Pro certificado
- Secrets: Google Secret Manager

### Dominio e infraestructura
- **deceroacien.app** / **www.deceroacien.app** → Frontend estático
- **api.deceroacien.app** → API Cloud Run
- Load Balancer con SSL termination automático
- DNS gestionado por Cloudflare

## Desarrollo local

### Requisitos
- Node.js 18+
- gcloud CLI configurado con proyecto `deceroacienfirebase`
- Acceso a Secret Manager para variables de entorno

### Setup rápido
```bash
# Instalar dependencias
npm install

# Build frontend (compila Tailwind + genera dist/)
npm run build:frontend

# Desarrollo API local
npm run api:start

# Deploy manual completo (si no usas CI/CD)
npm run build:frontend
gsutil -m rsync -r dist gs://www-deceroacien-app
```

## CI/CD Pipeline

**Trigger automático**: Cada push a `main` ejecuta `cloudbuild.yaml`

1. Instala dependencias (`npm ci`)
2. Compila frontend (`npm run build:frontend`)
3. Sincroniza a bucket (`gsutil rsync`)
4. Construye imagen Docker API
5. Despliega a Cloud Run con secrets actualizados

## Documentación

- 📖 **[README-PLATAFORMA.md](./README-PLATAFORMA.md)** - Guía completa actualizada
- 💳 **Pagos**: Ver sección de Mercado Pago en plataforma
- 🔐 **Auth**: Integración Supabase documentada
- 🏗️ **Infraestructura**: Load balancer, CDN, certificados SSL

## Archivos obsoletos

Los siguientes archivos están marcados como obsoletos tras la migración a Cloud:

- `README-MERCADOPAGO.md` - Información parcialmente desactualizada
- `README-FULL-ACCESS.md` - Para demo/testing, no usado en producción
- `README-DB.md` - Vacío, funcionalidad integrada en API
- `assets/js/firebase-*.js` - Migrado a Supabase

## Operaciones comunes

```bash
# Verificar estado de certificados SSL
gcloud compute ssl-certificates list --project=deceroacienfirebase

# Invalidar CDN tras cambios críticos
gcloud compute url-maps invalidate-cdn-cache lb-deceroacien --path="/*"

# Ver logs de builds recientes
gcloud builds list --limit=5 --project=deceroacienfirebase

# Deploy manual de emergencia
gcloud builds submit --config cloudbuild.yaml .
```

## Contacto técnico

Para cambios de infraestructura, certificados SSL, o configuración de dominio contactar al equipo técnico.

---

**Última actualización**: Octubre 2025 tras migración completa a Google Cloud