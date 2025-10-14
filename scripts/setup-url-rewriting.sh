#!/bin/bash

# Script para configurar URL rewriting en Google Cloud Load Balancer
# Elimina extensiones .html de las URLs

PROJECT_ID="tu-project-id"
URL_MAP_NAME="deceroacien-url-map"
BACKEND_BUCKET="deceroacien-static"

echo "🚀 Configurando URL rewriting para eliminar extensiones .html"

# 1. Crear reglas de URL Map
cat > url-map-config.json << EOF
{
  "name": "$URL_MAP_NAME",
  "defaultService": "projects/$PROJECT_ID/global/backendBuckets/$BACKEND_BUCKET",
  "pathMatchers": [
    {
      "name": "html-rewrite",
      "defaultService": "projects/$PROJECT_ID/global/backendBuckets/$BACKEND_BUCKET",
      "routeRules": [
        {
          "priority": 1,
          "matchRules": [{"exactMatch": "/conexion-vivo"}],
          "routeAction": {
            "urlRewrite": {"pathPrefixRewrite": "/conexion-vivo.html"}
          }
        },
        {
          "priority": 2,
          "matchRules": [{"exactMatch": "/ejemplos-sala-espera"}],
          "routeAction": {
            "urlRewrite": {"pathPrefixRewrite": "/ejemplos-sala-espera.html"}
          }
        },
        {
          "priority": 3,
          "matchRules": [{"exactMatch": "/portal-alumno"}],
          "routeAction": {
            "urlRewrite": {"pathPrefixRewrite": "/portal-alumno.html"}
          }
        },
        {
          "priority": 100,
          "matchRules": [{"regexMatch": "^/([a-zA-Z0-9-_]+)$"}],
          "routeAction": {
            "urlRewrite": {"pathTemplateRewrite": "/\\\\1.html"}
          }
        }
      ]
    }
  ],
  "hostRules": [
    {
      "hosts": ["deceroacien.app", "www.deceroacien.app"],
      "pathMatcher": "html-rewrite"
    }
  ]
}
EOF

# 2. Aplicar configuración
echo "📝 Aplicando configuración de URL Map..."
gcloud compute url-maps import $URL_MAP_NAME \
  --source=url-map-config.json \
  --project=$PROJECT_ID

# 3. Verificar configuración
echo "✅ Verificando configuración..."
gcloud compute url-maps describe $URL_MAP_NAME --project=$PROJECT_ID

# 4. Limpiar archivos temporales
rm url-map-config.json

echo "🎉 Configuración completada!"
echo ""
echo "URLs ahora disponibles:"
echo "✅ https://deceroacien.app/conexion-vivo"
echo "✅ https://deceroacien.app/ejemplos-sala-espera" 
echo "✅ https://deceroacien.app/portal-alumno"
echo ""
echo "⚠️  Nota: Los cambios pueden tardar 5-10 minutos en propagarse globalmente"