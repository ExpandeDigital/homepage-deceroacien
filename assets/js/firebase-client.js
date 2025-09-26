/* Inicialización cliente Firebase (Auth) - carga opcional
 * Instrucciones:
 * 1. Añade en el <head> (ANTES de auth.js) los scripts CDN:
 *    <script src="https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js"></script>
 *    <script src="https://www.gstatic.com/firebasejs/10.13.1/firebase-auth-compat.js"></script>
 * 2. Define la config en window.__FIREBASE_APP_CONFIG = { apiKey: '...', authDomain: '...', projectId: '...', ... };
 * 3. Incluye este archivo y luego auth.js.
 */
(function(){
  function initFirebase() {
    if (!window.__FIREBASE_APP_CONFIG) {
      console.warn('[firebase-client] No hay window.__FIREBASE_APP_CONFIG definido (modo fallback).');
      return;
    }
    if (!window.firebase || !window.firebase.initializeApp) {
      console.warn('[firebase-client] SDK Firebase no cargado aún.');
      return;
    }
    try {
      const app = window.firebase.apps && window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(window.__FIREBASE_APP_CONFIG);
      const auth = window.firebase.auth();
      window.__firebaseApp = app;
      window.__firebaseAuth = auth;
      console.log('[firebase-client] Firebase inicializado.');
    } catch (e) {
      console.error('[firebase-client] Error inicializando Firebase', e);
    }
  }

  // Si el SDK ya está, inicializa; si no, espera al evento centralizado
  if (typeof document !== 'undefined') {
    if (window.firebase && window.firebase.initializeApp) {
      initFirebase();
    } else {
      document.addEventListener('firebase:sdk-ready', initFirebase, { once: true });
    }
  }
})();
