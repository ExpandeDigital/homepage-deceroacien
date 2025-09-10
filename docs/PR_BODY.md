Este PR trae desde IgnacioJofreGrra/main una actualización integral del sitio.

## Principales cambios
- Header/Footer dinámicos vía `assets/js/components.js`.
- Nuevas páginas: Blog (`blog.html`) y Preguntas Frecuentes (`faq.html`) integradas al menú.
- 5 artículos del Blog con tipografía `.prose` y layout unificado.
- Estilos centralizados en `assets/styles/common.css` y `assets/styles/mobile.css` (tokens, cards, botones, `.prose`, helpers).
- Normalización de páginas clave (`index`, `nosotros`, `servicios`, `metodologia`, `academy`, `contacto`) sin estilos inline.
- Botón flotante de WhatsApp y mejoras de navegación móvil.
- Ajustes de accesibilidad (focus, contraste) y utilidades responsivas.

## Notas
- Los artículos marcan "Blog" activo en el header automáticamente.
- Banners promocionales usan clase reutilizable `.promo-banner` y CTAs estándar `.btn-primary`.

Quedo atento a comentarios para iterar.
