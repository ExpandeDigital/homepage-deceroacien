(function(w){
  let _supabase = null;
  async function ensureSupabase() {
    if (_supabase) return _supabase;
    // cargar lib si no está
    if (!w.createClient) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://esm.sh/@supabase/supabase-js@2.45.4?bundle';
        s.type = 'module';
        // fallback: usar import() dinámico si el navegador soporta modules
        s.onload = resolve; s.onerror = () => resolve();
        document.head.appendChild(s);
      });
    }
    // Obtener config pública del backend (components.js ya lo hace, pero por si se llama temprano)
    if (!w.__PUBLIC_CONFIG) {
      try {
        const base = (w.PublicAuthConfig && w.PublicAuthConfig.api && w.PublicAuthConfig.api.baseUrl) || '/api';
        const r = await fetch(base.replace(/\/$/, '') + '/public-config', { cache: 'no-store' });
        w.__PUBLIC_CONFIG = r.ok ? await r.json() : {};
      } catch(_){ w.__PUBLIC_CONFIG = {}; }
    }
    const sup = w.__PUBLIC_CONFIG && w.__PUBLIC_CONFIG.supabase || {};
    if (!sup.url || !sup.anonKey) {
      console.warn('[supabase-client] Config supabase faltante en /api/public-config');
      return null;
    }
    try {
      // import dinámico
      const mod = await import('https://esm.sh/@supabase/supabase-js@2.45.4');
      _supabase = mod.createClient(sup.url, sup.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      w.__supabase = _supabase;
      try {
        const storage = (w.PublicAuthConfig && w.PublicAuthConfig.storage) || { userKey: 'deceroacien_user', tokenKey: 'deceroacien_token' };
        _supabase.auth.onAuthStateChange(async (event, session) => {
          try {
            if (session && session.user) {
              const u = session.user;
              const fullName = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '';
              const [firstName, ...rest] = fullName.split(' ');
              const simpleUser = {
                id: u.id,
                email: u.email,
                firstName: firstName || null,
                lastName: rest.join(' ') || null
              };
              localStorage.setItem(storage.userKey, JSON.stringify(simpleUser));
              localStorage.setItem(storage.tokenKey, session.access_token);
              // Notificar backend
              const apiBase = (w.PublicAuthConfig && w.PublicAuthConfig.api && w.PublicAuthConfig.api.baseUrl) || '/api';
              try { await fetch(apiBase + '/auth/verify', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token } }); } catch(_){ }
              try { await fetch(apiBase + '/auth/me', { headers: { Authorization: 'Bearer ' + session.access_token } }); } catch(_){ }
              if (w.authManager) {
                w.authManager.currentUser = simpleUser; w.authManager.isAuthenticated = true;
              }
            } else {
              localStorage.removeItem(storage.userKey);
              localStorage.removeItem(storage.tokenKey);
              if (w.authManager) { w.authManager.currentUser = null; w.authManager.isAuthenticated = false; }
            }
          } catch(e){ console.warn('[supabase-client] onAuthStateChange error', e); }
        });
      } catch(_){ }
      return _supabase;
    } catch (e) {
      console.error('[supabase-client] No se pudo crear el cliente:', e);
      return null;
    }
  }

  async function signInWithGoogle() {
    const sb = await ensureSupabase();
    if (!sb) throw new Error('supabase_not_ready');
    const redirectTo = (w.location && w.location.origin) ? `${w.location.origin}/auth/dashboard.html` : undefined;
    const { data, error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error; return data;
  }

  async function getAccessToken() {
    const sb = await ensureSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  }

  w.SupabaseAuth = { ensureSupabase, signInWithGoogle, getAccessToken };
})(window);
