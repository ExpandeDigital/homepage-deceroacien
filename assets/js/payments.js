/**
 * payments.js - Integración ligera con Mercado Pago (Checkout Pro)
 * No expone credenciales; llama a /api/mp/create-preference
 */
(function (w) {
  const Payments = {
    async startCheckout({ items = [], returnTo = null } = {}) {
      try {
        // Información mínima del usuario (si tienes auth local) para external_reference
        const user = (w.authManager && w.authManager.isUserAuthenticated && w.authManager.isUserAuthenticated())
          ? (w.authManager.getCurrentUser && w.authManager.getCurrentUser())
          : null;
        const idToken = (w.authManager && w.authManager.getIdToken) ? await w.authManager.getIdToken() : null;

        const payload = {
          items,
          user: user ? { id: user.id || null, email: user.email || null } : {},
          returnTo: returnTo || w.location.href
        };

        const isDev = !!(w.Environment && w.Environment.isDevelopment);
        let endpoint;
        if (isDev) {
          endpoint = 'http://localhost:3001/api/mp/create-preference';
        } else if (w.PublicAuthConfig && w.PublicAuthConfig.api && w.PublicAuthConfig.api.baseUrl) {
          endpoint = w.PublicAuthConfig.api.baseUrl + '/mp/create-preference';
        } else if ((w.location && /(^|\.)deceroacien\.app$/.test(w.location.hostname))) {
          // Fallback seguro en producción para evitar usar /api relativo (Vercel)
          endpoint = 'https://api.deceroacien.app/api/mp/create-preference';
        } else {
          endpoint = '/api/mp/create-preference';
        }

        const headers = { 'Content-Type': 'application/json' };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error('No se pudo crear la preferencia:', data);
          alert('No se pudo iniciar el pago. Inténtalo de nuevo.');
          return;
        }

  // Para pruebas con usuarios de prueba, preferimos sandbox_init_point
  const url = data.sandbox_init_point || data.init_point;
        if (!url) {
          alert('No se pudo iniciar el pago (URL no disponible).');
          return;
        }
        w.location.href = url;
      } catch (e) {
        console.error('Error iniciando checkout:', e);
        alert('Error iniciando el pago.');
      }
    }
  };

  w.Payments = Payments;
})(window);
