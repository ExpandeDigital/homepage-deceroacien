# Modo Full Access Demo

Esta rama (`feature/full-access-demo`) simula un cliente con acceso completo a todos los productos, cursos, fases y herramientas.

## Objetivos
- Demostraciones y validación de UX sin fricción de gating.
- Pruebas de modelo de progreso local.
- Base para evolucionar a reporting real más adelante.

## Componentes clave
- `assets/js/demo-full-access.js`: Aplica entitlements y modelo de progreso a cualquier usuario autenticado (agnóstico de proveedor: Google u otro método local).
- Ya no existe un usuario único forzado; si no hay sesión, el script no interfiere con el flujo de login.
- Entitlements almacenados en `localStorage.deceroacien_entitlements`.
- Progreso almacenado en `localStorage.deceroacien_progress`.

## Uso rápido
1. Abrir `portal-alumno.html` o `auth/dashboard.html` en un navegador.
2. Iniciar sesión (Google One Tap/Popup o el método de login local). El script aplicará todos los entitlements al usuario autenticado.
3. Se renderiza un bloque de progreso si la página define un contenedor con `data-progress-dashboard`.
4. Pulsar `Shift + P` abre un panel de debug para ver / resetear el progreso.

## Estructura de Progreso
```json
{
  "fases": { "fase_1_ecd": { "completed": 5, "total": 12 }, ... },
  "cursos": { "course.pmv": { "completed": 8, "total": 20 }, ... },
  "herramientas": { "tool.canvas": true, ... },
  "updatedAt": "2025-..",
  "version": 1
}
```

## API Global
`window.ProgressModel` expone:
- `getState()`
- `markCompleted(id)` → Ej: `ProgressModel.markCompleted('course.pmv:leccion_3')`
- `set(entity, data)`
- `reset()`

Evento custom: `progress:updated` se dispara tras cambios.

## Extensión de entitlements
El script inspecciona el DOM (`[data-entitlement]`, `[data-entitlement-any]`) y fusiona con la lista base. Si se agregan nuevos tokens en HTML se incorporan automáticamente tras recargar.

## Regeneración automática
Si el usuario borra manualmente:
- `deceroacien_entitlements` → se recalculan.
- `deceroacien_progress` → se restaura modelo inicial.
- Sesión/usuario → se vuelven a crear.

## Consideraciones
- No hay backend real: todo ocurre en `localStorage`.
- Evitar llevar este script a `main` salvo feature flagging.
- Para limpiar y re-probar: borrar en DevTools `deceroacien_entitlements`, `deceroacien_progress` y (si aplica) el usuario de sesión local, luego recargar.

## Próximos pasos sugeridos
- Llevar el modelo de progreso a granularidad real (módulos / lecciones).
- Integrar eventos de interacción para avance automático.
- Persistencia remota cuando exista backend.

---
Contacto: Equipo Plataforma Deceroacien
