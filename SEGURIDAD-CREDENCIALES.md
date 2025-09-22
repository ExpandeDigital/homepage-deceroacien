# 🔒 GUÍA DE SEGURIDAD - CREDENCIALES

## ⚠️ IMPORTANTE: Credenciales Sensibles

### ✅ Lo que SÍ puede ser público:
- **Google Client ID**: `297028055567-***REDACTED***-apps.googleusercontent.com`
- URLs de redirección
- Configuración de UI
- Endpoints de API (sin claves)

### ❌ Lo que NUNCA debe ser público:
- **Google Client Secret**: `GOCSPX-***REDACTED***` ⚠️ **NUNCA EXPONER**
- Credenciales de base de datos
- JWT secrets
- API keys privadas
- Tokens de acceso

## 📁 Archivos Sensibles Movidos:

### ✅ Archivos Seguros Creados:
- `.env` - Variables de entorno (NO SUBIR A GIT)
- `.gitignore` - Protege archivos sensibles
- `auth-config.js` - Solo configuración pública

### ❌ Archivos a Eliminar:
- `client_secret_*.json` - ⚠️ ELIMINAR INMEDIATAMENTE
- Cualquier archivo con credenciales

## 🛡️ Medidas de Seguridad Implementadas:

### 1. Separación de Configuración
```javascript
// ✅ PÚBLICO (en auth-config.js)
googleClientId: '297028055567-***REDACTED***-apps.googleusercontent.com'

// ❌ PRIVADO (en .env o backend)
GOOGLE_CLIENT_SECRET=GOCSPX-***REDACTED***
```

### 2. .gitignore Configurado
```
.env
client_secret_*.json
*credentials*
*oauth*
```

### 3. Variables de Entorno
```bash
# En .env (NO SUBIR A GIT)
GOOGLE_CLIENT_SECRET=GOCSPX-***REDACTED***
```

## 🔄 Cómo Usar en Producción:

### Frontend (Público)
```javascript
// Solo Client ID - OK para frontend
const config = {
    googleClientId: '297028055567-***REDACTED***-apps.googleusercontent.com'
};
```

### Backend (Privado)
```javascript
// Client Secret - SOLO en backend
const secret = process.env.GOOGLE_CLIENT_SECRET;
```

## 🚨 Acciones Inmediatas Requeridas:

### 1. Eliminar Archivo Sensible
```bash
# ELIMINAR INMEDIATAMENTE:
rm client_secret_***REDACTED***.json
```

### 2. Regenerar Client Secret (Recomendado)
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. APIs y servicios → Credenciales
3. Edita tu OAuth 2.0 Client ID
4. **Regenera el Client Secret**
5. Actualiza el nuevo secret en `.env`

### 3. Verificar .gitignore
```bash
# Verificar que .gitignore está funcionando:
git status
# No debe mostrar .env ni archivos sensibles
```

## 🔐 Configuración Segura por Entorno:

### Desarrollo Local
```bash
# .env.local
GOOGLE_CLIENT_SECRET=tu_nuevo_secret_aqui
DATABASE_URL=mongodb://localhost:27017/deceroacien
```

### Producción
```bash
# Variables de entorno del servidor
GOOGLE_CLIENT_SECRET=tu_secret_de_produccion
DATABASE_URL=mongodb://tu-servidor-prod/deceroacien
```

## ✅ Verificación de Seguridad:

### Checklist de Seguridad:
- [ ] ✅ Client Secret movido a .env
- [ ] ✅ .gitignore configurado
- [ ] ✅ Archivo JSON eliminado
- [ ] ✅ Client Secret regenerado (recomendado)
- [ ] ✅ Solo Client ID en frontend
- [ ] ✅ Variables de entorno en servidor

### Test de Seguridad:
```bash
# Verificar que credenciales no están en código:
grep -r "GOCSPX" ./assets/
# No debe devolver resultados

# Verificar .gitignore:
git ls-files | grep -E "\.(env|secret|credential)"
# No debe devolver archivos sensibles
```

## 🔮 Mejores Prácticas Futuras:

1. **Rotación de Credenciales**: Cambia secrets cada 90 días
2. **Monitoreo**: Alertas si credenciales aparecen en código
3. **Acceso Mínimo**: Solo los permisos necesarios
4. **Audit Logs**: Registrar acceso a credenciales
5. **Backup Seguro**: Credenciales en gestor de secretos

---

**⚠️ CRÍTICO**: El archivo `client_secret_*.json` debe eliminarse INMEDIATAMENTE del repositorio y regenerar el Client Secret en Google Cloud Console.
