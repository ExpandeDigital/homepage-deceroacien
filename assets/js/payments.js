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

        const payload = {
          items,
          user: user ? { id: user.id || null, email: user.email || null } : {},
          returnTo: returnTo || w.location.href
        };

        const endpoint = (w.Environment && w.Environment.isDevelopment)
          ? 'http://localhost:3000/api/mp/create-preference'
          : '/api/mp/create-preference'; // misma origin para evitar CORS y funcionar en previews

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error('No se pudo crear la preferencia:', data);
          alert('No se pudo iniciar el pago. Inténtalo de nuevo.');
          return;
        }

        const url = data.init_point || data.sandbox_init_point;
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
