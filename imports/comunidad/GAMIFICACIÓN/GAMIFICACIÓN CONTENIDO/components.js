(function (w) {
  const App = {};

  // Ejecuta un callback cuando el DOM está listo
  App.domReady = function (cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  };

  // Helpers de selección
  App.qs = (sel, root = document) => root.querySelector(sel);
  App.qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Muestra solo un contenedor y oculta el resto (ignora nulos)
  App.showOnly = function (elems, toShow) {
    elems.forEach(el => { if (el) el.classList.add('hidden'); });
    if (toShow) toShow.classList.remove('hidden');
  };

  // Formatea moneda CL
  App.formatCurrencyCL = function (value) {
    try {
      return '$' + Math.round(value).toLocaleString('es-CL');
    } catch (e) {
      return '$' + Math.round(value);
    }
  };

  // Anima un número dentro de un elemento
  App.animateNumber = function (element, start, end, { duration = 1000, suffix = '', decimals = 0 } = {}) {
    if (!element) return;
    let startTs = null;
    const step = (ts) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const cur = start + (end - start) * p;
      element.textContent = cur.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Pulso visual (útil para métricas)
  App.pulse = function (el, className = 'value-change') {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth; // reflow
    el.classList.add(className);
  };

  w.GameComponents = App;
})(window);
