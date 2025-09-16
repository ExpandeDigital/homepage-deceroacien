# Diagrama de Flujo de la Plataforma DE CERO A CIEN

Este documento resume el flujo actual de la plataforma y marca el estado de implementación de cada módulo: 
- [✅] Completado 100%
- [🟡] Parcial
- [⛔] Faltante

## Visión general

```mermaid
graph TD;
  subgraph Visitante
    A[Landing y Marketing index servicios metodologia blog faq conferencias];
    A -->|CTA| B[Academy academy html];
    A --> C[Contacto contacto html];
    A --> D[Conecta conecta];
    A --> G[Gamificacion gamificacion index html];
  end

  B -->|Ver programas y CTAs| E{Entitlements};
  E -->|Sin acceso| B1[CTA Comprar paginas bootcamp];
  E -->|Con acceso| P1[Portal Alumno portal alumno html];

  C --> C1[Formularios action pendiente];
  D --> D1[Comunidad Recursos informativos];
  G --> G1[Desafios HTML Recursos estaticos];

  subgraph Autenticacion
    L[Login y Register auth] --> H[AuthManager auth js];
    H -->|localStorage| S[Sesion];
    H -->|requireAuth| U[Dashboard auth dashboard html];
  end

  P1 -->|Cursos por fases| F1[Fase 1 fase 1 ecd];
  P1 --> F2[Fase 2 fase 2 ecd];
  P1 --> F3[Fase 3 fase 3 ecd];
  P1 --> F4[Fase 4 fase 4 ecd];
  P1 --> F5[Fase 5 fase 5 ecd];

  E -.->|Auto guard overlay si falta| F1;
  E -.-> F2;
  E -.-> F3;
  E -.-> F4;
  E -.-> F5;

  subgraph Layout
    X[components js Header Footer estilos basePath dinamico] --> A;
    X --> B;
    X --> L;
    X --> P1;
    X --> U;
  end

  subgraph Pagos e Integracion
    E2[grantAfterCheckout] --> E;
    Z[Backend API placeholders en config secure js] -.->|futura verificacion| H;
  end
```

## Estado de madurez por módulo
- UI unificada (Header/Footer, estilos, rutas): ✅ Completo (`assets/js/components.js`, `assets/styles/*`).
- Autenticación cliente (GIS, formularios, sesión local): 🟡 Parcial. No hay verificación de token ni refresh contra backend. `auth.js` simula login/registro.
- Entitlements y gating de contenidos: ✅ Completo en cliente. Incluye `?grant=` y auto-guard por carpeta.
- Pagos e integración real: ⛔ Faltante. Solo stub `paymentEntitlements.grantAfterCheckout`.
- Portal del Alumno y herramientas por fase: 🟡 Parcial. Estructura completa, contenido funcional depende de cada herramienta HTML.
- Formularios de contacto/consultoría: 🟡 Parcial. Muchos usan `action="#"`; falta envío a backend/servicio.
- Comunidad Conecta y Gamificación: 🟡 Parcial/Informativo. Páginas existen; falta wiring a funcionalidades dinámicas.

## Notas operativas para entender el “cómo”
- Carga de scripts recomendada: incluir siempre `assets/js/components.js` y, si hay acceso protegido, `assets/js/auth.js` y/o `assets/js/entitlements.js`.
- `components.js` detecta `basePath` según el `src` del script para que los enlaces funcionen dentro de subcarpetas (por ejemplo en `/auth/` o `/conecta/`).
- Protección por ruta: acceder directo a `/fase_*_ecd/` sin entitlement muestra un overlay con CTA; no destruye el DOM, se puede inspeccionar.
- Simular compra: añadir `?grant=course.pmv` a la URL o ejecutar `paymentEntitlements.grantAfterCheckout({ items: ['course.pmv'] })` en consola.
- GIS: `config-secure.js` expone `window.PublicAuthConfig` y `googleClientId` (construido en runtime). `auth/*.html` carga `https://accounts.google.com/gsi/client?hl=es`.

## Principales archivos de referencia
- Layout y navegación: `assets/js/components.js`, `assets/templates/base.html`.
- Autenticación: `assets/js/config-secure.js`, `assets/js/auth.js`, `auth/*.html`.
- Entitlements: `assets/js/entitlements.js`, `portal-alumno.html`, `academy.html`.
- Marketing: `index.html`, `servicios.html`, `metodologia.html`, `blog.html`.
- Comunidad y juegos: `conecta/*.html`, `gamificacion/`.

## Claves y datos en el navegador
- Sesión/Auth (localStorage):
  - `deceroacien_user`: JSON del usuario autenticado (cliente).
  - `deceroacien_token`: token simulado (no validado contra backend).
  - `deceroacien_session`: flag de persistencia (remember-me).
- Entitlements (localStorage):
  - `deceroacien_entitlements`: array de strings, ej. `['course.pmv','course.pmf']`.
  - `deceroacien_entitlements_updated`: timestamp para broadcast entre pestañas.

## Diagramas de secuencia clave

### Login con Google y carga de Dashboard

```mermaid
sequenceDiagram
  participant User as Usuario
  participant Page as auth/login.html
  participant GIS as Google Identity Services
  participant Auth as assets/js/auth.js (AuthManager)
  participant LS as localStorage
  participant Dash as auth/dashboard.html

  User->>Page: Abre Login
  Page->>GIS: Carga gsi/client (es)
  Page->>Auth: initializeAuthManager()
  User->>GIS: Click botón Google
  GIS-->>Page: credential (JWT)
  Page->>Auth: handleCredentialResponse(credential)
  Auth->>Auth: decodeJwtResponse()
  Auth->>LS: Guarda deceroacien_user/deceroacien_token
  Auth->>Page: redirectAfterAuth()
  Page->>Dash: Redirección
  Dash->>Auth: requireAuth() (ok)
  Dash-->>User: Muestra Dashboard
```

### Acceso a herramienta protegida sin entitlement

```mermaid
sequenceDiagram
  participant User as Usuario
  participant Tool as /fase_3_ecd/*.html
  participant Ent as assets/js/entitlements.js
  participant LS as localStorage

  User->>Tool: Navega directo
  Tool->>Ent: init() + applyPathAutoGuard()
  Ent->>LS: Lee deceroacien_entitlements
  Ent-->>Tool: ¿Tiene 'course.pmf'?
  alt No tiene
    Ent->>Tool: Inserta overlay + CTA (Login / Comprar)
  else Tiene
    Tool-->>User: Muestra contenido
  end
```

## Leyenda / Cómo leer el diagrama
- Rectángulos: páginas HTML o módulos principales.
- Rombo (Mermaid `{}`): lógica condicional (p.ej., entitlements).
- Líneas punteadas: acciones automáticas (auto-guard, overlays).
- Emoji de estado:
  - ✅ Implementado y operativo en cliente.
  - 🟡 Implementado parcialmente o con stubs.
  - ⛔ No implementado en este repo (requiere backend/servicio externo).

## Siguientes pasos sugeridos (no bloqueantes)
- Backend mínimo para auth real: verificar token de Google, emitir JWT propio y refresh.
- Webhook/return de checkout para llamar `grantAfterCheckout()` con los productos comprados.
- Formularios: integrar servicio (p.ej. Formspark/Netlify/Cloudflare Workers) o API propia.
- Progreso en Portal: persistir estados de herramientas en localStorage y/o backend.
