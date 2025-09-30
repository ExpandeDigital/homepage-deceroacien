(function(){
  function hasDebugFlag(){
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('debug') === '1') return true;
      return localStorage.getItem('deceroacien_debug') === '1';
    } catch { return false; }
  }

  if (!hasDebugFlag()) return;

  const state = {
    logs: [],
    flags: {
      firebaseConfig: false,
      firebaseSDKReady: false,
      firebaseAuthReady: false,
      gisLoaded: false,
      gisInitialized: false,
      googleClientId: null
    }
  };

  // UI básica
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:12px;right:12px;width:380px;max-height:60vh;background:rgba(2,6,23,0.96);color:#e6f1ff;border:1px solid #1e2d4d;border-radius:10px;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.35);font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;font-size:12px;display:flex;flex-direction:column;';
  panel.innerHTML = '<div style="padding:8px 10px;border-bottom:1px solid #1e2d4d;display:flex;align-items:center;gap:8px;justify-content:space-between;">\
    <strong>Debug Auth</strong>\
    <div>\
      <button id="dbg_copy" style="margin-right:6px;padding:4px 8px;background:#0ea5e9;color:#011627;border:none;border-radius:6px;cursor:pointer;">Copiar</button>\
      <button id="dbg_clear" style="padding:4px 8px;background:#64748b;color:#011627;border:none;border-radius:6px;cursor:pointer;">Limpiar</button>\
    </div>\
  </div>\
  <div id="dbg_status" style="padding:8px 10px;display:grid;grid-template-columns: 1fr 1fr;gap:6px;border-bottom:1px solid #1e2d4d;"></div>\
  <div id="dbg_logs" style="padding:8px 10px;overflow:auto;flex:1"></div>';
  document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild(panel));

  const logsEl = panel.querySelector('#dbg_logs');
  const statusEl = panel.querySelector('#dbg_status');
  panel.querySelector('#dbg_clear').onclick = () => { state.logs.length = 0; renderLogs(); };
  panel.querySelector('#dbg_copy').onclick = () => {
    const txt = state.logs.map(l => `[${l.level}] ${new Date(l.ts).toISOString()} ${l.msg}`).join('\n');
    navigator.clipboard.writeText(txt).catch(()=>{});
  };

  function renderStatus(){
    const b = (ok)=> `<span style="background:${ok?'#16a34a':'#ef4444'};padding:2px 6px;border-radius:9999px;color:#fff;font-weight:600;font-size:11px;">${ok?'OK':'FAIL'}</span>`;
    const cid = state.flags.googleClientId || '(no)';
    statusEl.innerHTML = `
      <div>Config: ${b(!!state.flags.firebaseConfig)}</div>
      <div>SDK: ${b(!!state.flags.firebaseSDKReady)}</div>
      <div>Auth: ${b(!!state.flags.firebaseAuthReady)}</div>
      <div>GIS script: ${b(!!state.flags.gisLoaded)}</div>
      <div>GIS init: ${b(!!state.flags.gisInitialized)}</div>
      <div style="grid-column:1/3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">ClientID: ${cid}</div>
    `;
  }
  function renderLogs(){
    logsEl.innerHTML = state.logs.slice(-200).map(l => `<div><span style="opacity:.65">${new Date(l.ts).toLocaleTimeString()}</span> <strong>[${l.level}]</strong> ${l.msg}</div>`).join('');
    renderStatus();
  }
  function log(level, msg){ state.logs.push({ level, msg, ts: Date.now() }); renderLogs(); }

  // Señales iniciales
  state.flags.firebaseConfig = !!window.__FIREBASE_APP_CONFIG;
  try { state.flags.googleClientId = (window.PublicAuthConfig && window.PublicAuthConfig.googleClientId) || null; } catch {}
  renderStatus();

  // Errores globales
  window.addEventListener('error', (e)=> log('error', e.message || 'window.error'));
  window.addEventListener('unhandledrejection', (e)=> log('error', (e.reason && (e.reason.message||e.reason)) || 'unhandledrejection'));

  // Consola proxy (error/warn)
  const _err = console.error.bind(console); const _warn = console.warn.bind(console); const _log = console.log.bind(console);
  console.error = (...args)=>{ log('error', args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')); _err(...args); };
  console.warn = (...args)=>{ log('warn', args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')); _warn(...args); };
  console.log = (...args)=>{ log('log', args.map(a=> typeof a==='string'?a:JSON.stringify(a)).join(' ')); _log(...args); };

  // Firebase eventos
  document.addEventListener('firebase:sdk-ready', ()=>{ 
    state.flags.firebaseSDKReady = true; 
    state.flags.firebaseConfig = !!window.__FIREBASE_APP_CONFIG;
    log('log','evento firebase:sdk-ready'); 
    setTimeout(()=>{ 
      state.flags.firebaseAuthReady = !!window.__firebaseAuth; 
      state.flags.firebaseConfig = !!window.__FIREBASE_APP_CONFIG;
      renderStatus(); 
    }, 0); 
  });
  if (window.__firebaseAuth) { state.flags.firebaseAuthReady = true; }

  // GIS detección
  function pollGIS(attempt=0){
    const ok = (typeof google !== 'undefined') && google.accounts && google.accounts.id;
    state.flags.gisLoaded = !!ok; renderStatus();
    if (!ok && attempt < 50) return setTimeout(()=>pollGIS(attempt+1), 200);
    if (!ok) log('warn','GIS no disponible tras espera.');
    else log('log','GIS detectado.');
  }
  document.addEventListener('DOMContentLoaded', ()=> pollGIS());

  // Detectar initialización real de GIS envolviendo initialize/renderButton
  function hookGIS(){
    try {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      if (google.accounts.id.__wrapped_dbg) return; // evitar doble wrap
      const origInit = google.accounts.id.initialize;
      const origRender = google.accounts.id.renderButton;
      google.accounts.id.initialize = function(cfg){
        state.flags.gisInitialized = true;
        if (cfg && cfg.client_id) state.flags.googleClientId = cfg.client_id;
        renderStatus();
        log('log','GIS initialize llamado');
        return origInit.apply(this, arguments);
      };
      google.accounts.id.renderButton = function(){
        log('log','GIS renderButton llamado');
        return origRender.apply(this, arguments);
      };
      google.accounts.id.__wrapped_dbg = true;
    } catch(e){ /* ignore */ }
  }
  const gisObs = new MutationObserver(hookGIS); gisObs.observe(document.documentElement, { childList:true, subtree:true });
  hookGIS();

  // Envolver handleCredentialResponse si existe (o cuando aparezca)
  function hookHCR(){
    if (!window.handleCredentialResponse || window.__hcrHooked) return;
    const orig = window.handleCredentialResponse;
    window.handleCredentialResponse = function(r){ log('log','handleCredentialResponse invocado'); try { return orig.call(this, r); } catch(e){ console.error('handleCredentialResponse error', e); throw e; } };
    window.__hcrHooked = true;
  }
  const ob = new MutationObserver(hookHCR); ob.observe(document.documentElement, { childList:true, subtree:true });
  hookHCR();

  // Mensajes útiles al iniciar
  log('log', 'Debug Auth activado. Usa ?debug=1 en la URL para ocultarlo/mostrarlo.');
  if (!state.flags.googleClientId) log('warn','PublicAuthConfig.googleClientId no definido.');
})();
