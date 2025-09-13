/**
 * SISTEMA DE COMPONENTES JAVASCRIPT ORIENTADO A OBJETOS
 * 
 * Este archivo implementa un sistema completo de componentes reutilizables
 * siguiendo los principios de Programación Orientada a Objetos (POO):
 * 
 * PATRONES IMPLEMENTADOS:
 * - Factory Pattern: Para crear instancias de componentes
 * - Observer Pattern: Para manejo de eventos
 * - Singleton Pattern: Para el gestor principal de la aplicación
 * - Strategy Pattern: Para diferentes tipos de componentes
 * 
 * ARQUITECTURA:
 * 1. BaseComponent: Clase abstracta base con funcionalidad común
 * 2. Componentes especializados: HeaderComponent, FooterComponent, CardComponent
 * 3. AppManager: Controlador principal que orquesta todos los componentes
 * 4. Utilidades: Funciones helper y configuración global
 */

/**
 * Utilidades y configuración global
 */
const GlobalConfig = {
    basePath: '' // Prefijo para rutas relativas ("", "../", "../../", etc.)
};

/**
 * Detecta el basePath a partir del src del script que carga este archivo.
 * Permite que las rutas del header/footer funcionen desde subcarpetas.
 */
function detectBasePath() {
    try {
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].getAttribute('src') || '';
            // Buscar el script de components.js en cualquier nivel
            if (/assets\/js\/components\.js$/.test(src)) {
                // Extraer la parte previa a "assets/js/components.js"
                const withoutFile = src.replace(/assets\/js\/components\.js$/, '');
                GlobalConfig.basePath = withoutFile || '';
                break;
            }
        }
    } catch (e) {
        console.warn('No se pudo detectar basePath automáticamente, usando ""');
        GlobalConfig.basePath = '';
    }
}

// Detectar basePath lo antes posible
if (typeof document !== 'undefined') {
    detectBasePath();
}

/**
 * Inyecta estilos globales si no están presentes (common.css y mobile.css)
 */
function ensureGlobalStyles() {
    try {
        const head = document.head || document.getElementsByTagName('head')[0];
        const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(l => l.getAttribute('href') || '');

        const styles = [
            `${GlobalConfig.basePath}assets/styles/common.css`,
            `${GlobalConfig.basePath}assets/styles/mobile.css`
        ];

        styles.forEach(href => {
            const already = existing.some(e => e.endsWith(href.replace(GlobalConfig.basePath, '')) || e === href);
            if (!already) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                head.appendChild(link);
            }
        });
    } catch (e) {
        console.warn('No se pudieron inyectar estilos globales:', e);
    }
}

/**
 * Crea placeholders de header/footer si no existen en el DOM
 */
function ensureHeaderFooterPlaceholders() {
    const body = document.body;
    if (!document.querySelector('.header-component')) {
        const header = document.createElement('header');
        header.className = 'header-component';
        body.insertAdjacentElement('afterbegin', header);
    }
    if (!document.querySelector('.footer-component')) {
        const footer = document.createElement('footer');
        footer.className = 'footer-component';
        body.insertAdjacentElement('beforeend', footer);
    }
}

/**
 * CLASE BASE ABSTRACTA - BaseComponent
 * 
 * Actúa como clase padre para todos los componentes del sistema.
 * Implementa el patrón Template Method para definir el ciclo de vida
 * común de todos los componentes.
 * 
 * RESPONSABILIDADES:
 * - Gestión del ciclo de vida (init, destroy)
 * - Manejo básico de eventos
 * - Validación de estado
 * - Logging básico para debugging
 */
class BaseComponent {
    /**
     * Constructor de la clase base
     * @param {HTMLElement} element - Elemento DOM asociado al componente
     */
    constructor(element) {
        this.element = element;
        this.isInitialized = false;
        this.eventListeners = new Map(); // Registro de eventos para limpieza
    }

    /**
     * Método template para inicializar el componente
     * Define el flujo estándar de inicialización que siguen todos los componentes
     * 
     * PATRÓN: Template Method
     * FLUJO: Validación → Marcado como inicializado → Eventos → Log
     */
    init() {
        if (this.isInitialized) {
            console.warn(`Componente ${this.constructor.name} ya inicializado`);
            return;
        }
        
        this.isInitialized = true;
        this.bindEvents();
        this.logInitialization();
    }

    /**
     * Método virtual para vincular eventos específicos del componente
     * Las clases hijas deben sobrescribir este método si necesitan eventos
     * 
     * PATRÓN: Template Method (Hook Method)
     */
    bindEvents() {
        // Implementación por defecto vacía
        // Las clases derivadas pueden sobrescribir este método
    }

    /**
     * Log de inicialización para debugging y monitoreo
     * Ayuda en el desarrollo y troubleshooting
     */
    logInitialization() {
        console.log(`✅ ${this.constructor.name} inicializado correctamente`);
    }

    /**
     * Método para registrar event listeners con cleanup automático
     * Evita memory leaks registrando todos los eventos para limpieza posterior
     * 
     * @param {string} event - Tipo de evento
     * @param {Function} handler - Función manejadora
     * @param {Object} options - Opciones del event listener
     */
    addEventListener(event, handler, options = {}) {
        if (this.element) {
            this.element.addEventListener(event, handler, options);
            // Registrar para cleanup posterior
            this.eventListeners.set(event, { handler, options });
        }
    }

    /**
     * Método para destruir el componente y limpiar recursos
     * Implementa cleanup automático para evitar memory leaks
     * 
     * PATRÓN: Destructor simulado en JavaScript
     */
    destroy() {
        if (!this.isInitialized) return;

        // Limpiar todos los event listeners registrados
        this.eventListeners.forEach(({ handler }, event) => {
            if (this.element) {
                this.element.removeEventListener(event, handler);
            }
        });
        
        this.eventListeners.clear();
        this.isInitialized = false;
        
        // Solo log en debug mode para evitar spam en consola
        if (window.DEBUG_MODE) {
            console.log(`🗑️ ${this.constructor.name} destruido y limpiado`);
        }
    }
}

/**
 * CLASE ESPECIALIZADA - HeaderComponent
 * 
 * Extiende BaseComponent para manejar específicamente la navegación del sitio.
 * Implementa funcionalidades avanzadas como:
 * - Detección automática de página activa
 * - Menú móvil responsivo
 * - Gestión de estado de navegación
 * 
 * PATRONES IMPLEMENTADOS:
 * - State Pattern: Para el estado del menú móvil (abierto/cerrado)
 * - Observer Pattern: Para reaccionar a cambios de URL
 * - Factory Pattern: Para crear elementos del menú móvil dinámicamente
 */
class HeaderComponent extends BaseComponent {
    /**
     * Constructor del componente Header
     * Inicializa propiedades específicas del header
     */
    constructor(element) {
        super(element);
        this.mobileMenuButton = null;
        this.mobileMenu = null;
        this.isMenuOpen = false; // Estado del menú móvil
        this.currentPage = this.getCurrentPage(); // Detección automática de página
        this.breakpoint = 768; // Punto de quiebre para diseño responsivo
        this.basePath = GlobalConfig.basePath || '';
    }

    /**
     * Determina la página actual basada en la URL del navegador
     * Utiliza el pathname para extraer el nombre del archivo actual
     * 
     * @returns {string} Nombre de la página actual sin extensión
     * 
     * EJEMPLOS:
     * - "/index.html" → "index"
     * - "/nosotros.html" → "nosotros"
     * - "/" → "index" (página por defecto)
     */
    getCurrentPage() {
        const path = window.location.pathname || '';
        const filename = path.split('/').pop() || 'index.html';

        // Detección: si es un artículo del blog, marcamos como 'blog'
        const p = path.toLowerCase();
        const isBlogArticle = (
            p.includes('no_te_enamores_de_tu_idea') ||
            p.includes('tu_pmv_no_es_un_producto_barato') ||
            p.includes('tu_producto_ya_existe_y_ahora_que_la') ||
            p.includes('de_fundador_a_arquitecto_como_construir_una') ||
            p.includes('ya_eres_grande_ahora_se_imborrable')
        );
        if (isBlogArticle) return 'blog';

    // Detección: cualquier ruta dentro de /gamificacion/ activa 'gamificacion'
    if (p.includes('/gamificacion/')) return 'gamificacion';

        // Remover extensión .html y manejar casos comunes
        let pageName = filename.replace('.html', '');

        if (!pageName || pageName === '') {
            pageName = 'index';
        }

        return pageName;
    }

    /**
     * Inicializa el header con todas sus funcionalidades
     * Sobrescribe el método de la clase padre para agregar lógica específica
     * 
     * PATRÓN: Template Method Override
     */
    init() {
        super.init(); // Llamar al método padre
        this.generateHeaderHTML();
        this.createMobileMenu();
    this.applyMobileAuthVisibility();
        console.log('Header inicializado correctamente con HTML dinámico');
    }

    /**
     * Genera el HTML completo del header
     */
    generateHeaderHTML() {
    const headerHTML = `
            <nav class="header-nav">
                <!-- Logo principal -->
        <a href="${this.basePath}index.html" class="header-logo" aria-label="Inicio DE CERO A CIEN">
            <img src="${this.basePath}assets/logo_de_cero_a_cien_blanco_y_dorado.png" alt="DE CERO A CIEN" class="header-logo-img" loading="lazy" />
                </a>
                
                <!-- Navegación principal (desktop) -->
                <div class="header-nav-links">
            <a href="${this.basePath}index.html" class="header-link ${this.currentPage === 'index' ? 'active' : ''}">Inicio</a>
            <a href="${this.basePath}nosotros.html" class="header-link ${this.currentPage === 'nosotros' ? 'active' : ''}">Nosotros</a>
            <a href="${this.basePath}servicios.html" class="header-link ${this.currentPage === 'servicios' ? 'active' : ''}">Servicios</a>
            <a href="${this.basePath}metodologia.html" class="header-link ${this.currentPage === 'metodologia' ? 'active' : ''}">Metodología</a>
            <a href="${this.basePath}blog.html" class="header-link ${this.currentPage === 'blog' ? 'active' : ''}">Blog</a>
            <a href="${this.basePath}faq.html" class="header-link ${this.currentPage === 'faq' ? 'active' : ''}">FAQ</a>
            <a href="${this.basePath}gamificacion/index.html" class="header-link ${this.currentPage === 'gamificacion' ? 'active' : ''}">Gamificación</a>
            <a href="${this.basePath}contacto.html" class="header-link ${this.currentPage === 'contacto' ? 'active' : ''}">Contacto</a>
            <a href="${this.basePath}academy.html" class="header-link ${this.currentPage === 'academy' ? 'active' : ''}">Academy</a>
                </div>
                
                <!-- Sección de autenticación -->
                <div class="header-auth-section" id="headerAuthSection">
                    <a href="${this.basePath}auth/login.html" class="header-login-link">Ingresar</a>
                    <a href="${this.basePath}auth/register.html" class="header-register-btn">Registrarse</a>
                </div>
            </nav>
        `;

        this.element.innerHTML = headerHTML;
        
        // Verificar estado de autenticación después de generar el HTML
        setTimeout(() => this.updateAuthSection(), 100);
    }
    
    /**
     * Actualiza la sección de autenticación según el estado del usuario
     */
    updateAuthSection() {
        const authSection = document.getElementById('headerAuthSection');
        if (!authSection) return;
        
        // Verificar si el usuario está autenticado
        if (window.authManager && window.authManager.isUserAuthenticated()) {
            const user = window.authManager.getCurrentUser();
            const firstName = user.firstName || 'Usuario';
            
            authSection.innerHTML = `
                <div class="header-user-menu">
                    <span class="header-user-greeting">Hola, ${firstName}</span>
                    <a href="${this.basePath}auth/dashboard.html" class="header-dashboard-link">Dashboard</a>
                    <button class="header-logout-btn" data-logout>Salir</button>
                </div>
            `;
            
            // Agregar event listener al botón de logout
            const logoutBtn = authSection.querySelector('[data-logout]');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    if (window.authManager) {
                        window.authManager.logout();
                    }
                });
            }
        }
    }

    /**
     * Crea el menú móvil si no existe
     */
    createMobileMenu() {
        // Solo crear si estamos en viewport móvil
        if (window.innerWidth >= this.breakpoint) return;
        // Si ya existen referencias válidas no recreamos
        if (this.mobileMenuButton && this.mobileMenu) return;

        const nav = this.element.querySelector('.header-nav');
        if (!nav) return;

        const mobileButton = document.createElement('button');
        mobileButton.className = 'mobile-menu-button mobile-only';
        mobileButton.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        mobileButton.setAttribute('aria-label', 'Abrir menú de navegación');

        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        mobileMenu.innerHTML = this.getMobileMenuHTML();

        nav.appendChild(mobileButton);
        nav.appendChild(mobileMenu);

        this.mobileMenuButton = mobileButton;
        this.mobileMenu = mobileMenu;

        // Vincular evento de toggle inmediatamente (si bindEvents ya corrió)
        this.mobileMenuButton.addEventListener('click', () => this.toggleMobileMenu());
    }

    /**
     * Genera el HTML del menú móvil
     * @returns {string} HTML del menú móvil
     */
    getMobileMenuHTML() {
    return `
            <div class="mobile-menu-content">
        <a href="${this.basePath}index.html" class="mobile-menu-link">Inicio</a>
    <a href="${this.basePath}nosotros.html" class="mobile-menu-link">Nosotros</a>
        <a href="${this.basePath}servicios.html" class="mobile-menu-link">Servicios</a>
        <a href="${this.basePath}metodologia.html" class="mobile-menu-link">Metodología</a>
    <a href="${this.basePath}academy.html" class="mobile-menu-link">Academy</a>
    <a href="${this.basePath}blog.html" class="mobile-menu-link">Blog</a>
    <a href="${this.basePath}faq.html" class="mobile-menu-link">FAQ</a>
    <a href="${this.basePath}gamificacion/index.html" class="mobile-menu-link">Gamificación</a>
        <a href="${this.basePath}contacto.html" class="mobile-menu-link">Contacto</a>
                <div class="mobile-menu-auth">
                    <a href="#" class="mobile-auth-link">Ingresa</a>
                    <a href="#" class="mobile-register-btn">Regístrate</a>
                </div>
            </div>
        `;
    }

    /**
     * Vincula eventos del header
     */
    bindEvents() {
        // Resize handler para crear / eliminar menú móvil dinámicamente
        window.addEventListener('resize', () => this.handleResize());

        // Delegación segura (puede no existir aún al inicio)
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && this.mobileMenu && this.mobileMenuButton) {
                if (!this.mobileMenu.contains(e.target) && !this.mobileMenuButton.contains(e.target)) {
                    this.closeMobileMenu();
                }
            }
        });

        this.attachMobileInternalEvents();
    }

    /**
     * Enlaza eventos internos del menú móvil si existe
     */
    attachMobileInternalEvents() {
        if (this.mobileMenu) {
            this.mobileMenu.addEventListener('click', (e) => {
                if (e.target.classList && e.target.classList.contains('mobile-menu-link')) {
                    this.closeMobileMenu();
                }
            });
        }
    }

    /**
     * Maneja cambios de tamaño: crea menú en móvil y lo elimina en desktop
     */
    handleResize() {
        if (window.innerWidth < this.breakpoint) {
            // Crear si no existe
            if (!this.mobileMenuButton || !this.mobileMenu) {
                this.createMobileMenu();
                this.attachMobileInternalEvents();
            }
            this.applyMobileAuthVisibility();
        } else {
            // Eliminar si estamos en desktop
            if (this.mobileMenuButton) {
                this.mobileMenuButton.remove();
                this.mobileMenuButton = null;
            }
            if (this.mobileMenu) {
                this.mobileMenu.remove();
                this.mobileMenu = null;
            }
            this.isMenuOpen = false;
            document.body.style.overflow = '';
            this.applyMobileAuthVisibility();
        }
    }

    /**
     * Fuerza visibilidad correcta de la sección de autenticación:
     * - Oculta en móvil (< breakpoint)
     * - Muestra en desktop
     */
    applyMobileAuthVisibility() {
        const authSection = this.element.querySelector('.header-auth-section');
        if (!authSection) return;
        if (window.innerWidth < this.breakpoint) {
            authSection.style.display = 'none';
        } else {
            authSection.style.display = 'flex';
        }
    }

    /**
     * Alterna la visibilidad del menú móvil
     */
    toggleMobileMenu() {
        this.isMenuOpen ? this.closeMobileMenu() : this.openMobileMenu();
    }

    /**
     * Abre el menú móvil
     */
    openMobileMenu() {
        this.mobileMenu.classList.add('open');
        this.mobileMenuButton.classList.add('open');
        this.isMenuOpen = true;
        document.body.style.overflow = 'hidden'; // Prevenir scroll
    }

    /**
     * Cierra el menú móvil
     */
    closeMobileMenu() {
        this.mobileMenu.classList.remove('open');
        this.mobileMenuButton.classList.remove('open');
        this.isMenuOpen = false;
        document.body.style.overflow = ''; // Restaurar scroll
    }
}

/**
 * CLASE ESPECIALIZADA - FooterComponent
 * 
 * Extiende BaseComponent para generar y manejar específicamente el footer del sitio.
 * Genera dinámicamente todo el HTML del footer para mantener consistencia.
 * 
 * CARACTERÍSTICAS:
 * - Generación dinámica de HTML
 * - Enlaces contextuales según la página actual
 * - Estructura responsive
 * - Información de contacto centralizada
 */
class FooterComponent extends BaseComponent {
    constructor(element) {
        super(element);
        this.currentPage = this.getCurrentPage();
        this.currentYear = new Date().getFullYear();
    this.basePath = GlobalConfig.basePath || '';
    }

    /**
     * Determina la página actual para marcar enlaces activos
     */
    getCurrentPage() {
        const path = window.location.pathname || '';
        const filename = path.split('/').pop() || 'index.html';

        // Detección de artículos del blog para activar 'Blog'
        const p = path.toLowerCase();
        const isBlogArticle = (
            p.includes('no_te_enamores_de_tu_idea') ||
            p.includes('tu_pmv_no_es_un_producto_barato') ||
            p.includes('tu_producto_ya_existe_y_ahora_que_la') ||
            p.includes('de_fundador_a_arquitecto_como_construir_una') ||
            p.includes('ya_eres_grande_ahora_se_imborrable')
        );
        if (isBlogArticle) return 'blog';

    // Detección: rutas dentro de /gamificacion/
    if (p.includes('/gamificacion/')) return 'gamificacion';

        return filename.replace('.html', '') || 'index';
    }

    /**
     * Inicializa el footer generando su HTML dinámicamente
     */
    init() {
        super.init();
        this.generateFooterHTML();
        this.bindEvents();
        console.log('✅ FooterComponent inicializado correctamente');
    }

    /**
     * Genera el HTML completo del footer
     */
    generateFooterHTML() {
    const footerHTML = `
            <div class="footer-container">
                <!-- Grid de secciones del footer -->
                <div class="footer-grid">
                    <!-- Sección: Enlaces Rápidos -->
                    <div class="footer-section">
                        <h3>Enlaces Rápidos</h3>
                        <ul>
                <li><a href="${this.basePath}index.html" class="footer-link ${this.currentPage === 'index' ? 'active' : ''}">Inicio</a></li>
                <li><a href="${this.basePath}nosotros.html" class="footer-link ${this.currentPage === 'nosotros' ? 'active' : ''}">Nosotros</a></li>
                <li><a href="${this.basePath}servicios.html" class="footer-link ${this.currentPage === 'servicios' ? 'active' : ''}">Servicios</a></li>
                <li><a href="${this.basePath}metodologia.html" class="footer-link ${this.currentPage === 'metodologia' ? 'active' : ''}">Metodología</a></li>
                <li><a href="${this.basePath}blog.html" class="footer-link ${this.currentPage === 'blog' ? 'active' : ''}">Blog</a></li>
                <li><a href="${this.basePath}faq.html" class="footer-link ${this.currentPage === 'faq' ? 'active' : ''}">FAQ</a></li>
            </ul>
                    </div>
                    
                    <!-- Sección: Recursos -->
                    <div class="footer-section">
                        <h3>Recursos</h3>
                        <ul>
                <li><a href="${this.basePath}camino-dorado.html" class="footer-link ${this.currentPage === 'camino-dorado' ? 'active' : ''}">El Camino Dorado</a></li>
                <li><a href="${this.basePath}servicios.html" class="footer-link">Servicios Premium</a></li>
                <li><a href="${this.basePath}academy.html" class="footer-link ${this.currentPage === 'academy' ? 'active' : ''}">Academy</a></li>
                <li><a href="${this.basePath}gamificacion/index.html" class="footer-link ${this.currentPage === 'gamificacion' ? 'active' : ''}">Gamificación</a></li>
                <li><a href="${this.basePath}diagnosticos_ai.html" class="footer-link ${this.currentPage === 'diagnosticos_ai' ? 'active' : ''}">Diagnósticos con IA</a></li>
                <li><a href="${this.basePath}conecta/conecta.html" class="footer-link ${this.currentPage === 'conecta' ? 'active' : ''}">Conecta</a></li>
                <li><a href="${this.basePath}conferencias.html" class="footer-link ${this.currentPage === 'conferencias' ? 'active' : ''}">Conferencias</a></li>
                <li><a href="${this.basePath}soluciones_a_medida.html" class="footer-link ${this.currentPage === 'soluciones_a_medida' ? 'active' : ''}">Soluciones a Medida</a></li>
            </ul>
        </div>

                    <!-- Sección: Legal -->
                    <div class="footer-section">
                        <h3>Legal</h3>
                        <ul>
                <li><a href="${this.basePath}terminos.html" class="footer-link ${this.currentPage === 'terminos' ? 'active' : ''}">Términos y Condiciones</a></li>
                <li><a href="${this.basePath}politica_privacidad.html" class="footer-link ${this.currentPage === 'politica_privacidad' ? 'active' : ''}">Política de Privacidad</a></li>
                <li><a href="${this.basePath}politica_cookies.html" class="footer-link ${this.currentPage === 'politica_cookies' ? 'active' : ''}">Política de Cookies</a></li>
                <li><a href="${this.basePath}aviso_legal.html" class="footer-link ${this.currentPage === 'aviso_legal' ? 'active' : ''}">Aviso Legal</a></li>
                        </ul>
                    </div>
                    
                    <!-- Sección: Contacto -->
                    <div class="footer-section">
                        <h3>Contacto</h3>
                        <ul>
                            <li><a href="tel:+56985678296" class="footer-link">+56 985 678 296</a></li>
                <li><a href="mailto:hola@deceroacien.app" class="footer-link">hola@deceroacien.app</a></li>
                <li><a href="https://deceroacien.app" target="_blank" class="footer-link">www.deceroacien.app</a></li>
                <li><a href="${this.basePath}contacto.html" class="footer-link">Formulario de Contacto</a></li>
                        </ul>
                    </div>
                </div>
                
                <!-- Línea inferior con copyright -->
                <div class="footer-bottom">
                    <p class="footer-copyright">© ${this.currentYear} DE CERO A CIEN. Todos los derechos reservados.</p>
                </div>
            </div>
        `;

        this.element.innerHTML = footerHTML;
    }

    /**
     * Vincula eventos específicos del footer
     */
    bindEvents() {
        // Manejar enlaces externos
        this.handleExternalLinks();
        
        // Agregar tracking para enlaces del footer si es necesario
        const footerLinks = this.element.querySelectorAll('.footer-link');
        footerLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                // Aquí puedes agregar analytics o tracking
                console.log(`📊 Footer link clicked: ${link.textContent}`);
            });
        });
    }

    /**
     * Maneja enlaces externos para que se abran en nueva pestaña
     */
    handleExternalLinks() {
        const links = this.element.querySelectorAll('a[href^="http"], a[href^="mailto:"], a[href^="tel:"]');
        links.forEach(link => {
            if (link.href.startsWith('http') && !link.href.includes(window.location.hostname)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }
}

/**
 * Clase para manejar tarjetas interactivas
 * Proporciona funcionalidad común para todas las tarjetas
 */
class CardComponent extends BaseComponent {
    constructor(element) {
        super(element);
        this.hasSpotlight = element.classList.contains('card-spotlight');
    }

    /**
     * Inicializa la tarjeta
     */
    init() {
        super.init();
        if (this.hasSpotlight) {
            this.initSpotlightEffect();
        }
        console.log('Tarjeta inicializada correctamente');
    }

    /**
     * Inicializa el efecto spotlight
     */
    initSpotlightEffect() {
        this.element.addEventListener('mouseenter', () => {
            this.element.style.setProperty('--spotlight-opacity', '1');
        });

        this.element.addEventListener('mouseleave', () => {
            this.element.style.setProperty('--spotlight-opacity', '0');
        });
    }

    /**
     * Vincula eventos de la tarjeta
     */
    bindEvents() {
        this.element.addEventListener('click', this.handleCardClick.bind(this));
    }

    /**
     * Maneja el clic en la tarjeta
     * @param {Event} event - Evento de clic
     */
    handleCardClick(event) {
        // Buscar si hay un enlace principal en la tarjeta
        const primaryLink = this.element.querySelector('.card-primary-link, .cta-button:not(.cursor-not-allowed)');
        if (primaryLink && !event.target.closest('a, button')) {
            primaryLink.click();
        }
    }
}

/**
 * Componente global para botón flotante de WhatsApp
 * Garantiza presencia única en todo el sitio sin duplicaciones.
 */
class WhatsAppButtonComponent extends BaseComponent {
    constructor() {
        super(document.body); // El body servirá como ancla para insertar el botón
        this.phone = '+56985678296';
        this.id = 'whatsapp-floating';
    }

    init() {
        // Evitar duplicados si ya existe manualmente
        if (document.getElementById(this.id)) {
            console.log('ℹ️ Botón WhatsApp ya presente, no se duplica');
            return;
        }
        this.render();
        this.logInitialization();
    }

    buildURL() {
        const base = 'https://wa.me/';
        const phoneDigits = this.phone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent('Hola, quisiera más información sobre sus servicios.');
        return `${base}${phoneDigits}?text=${msg}`;
    }

    render() {
        const a = document.createElement('a');
        a.id = this.id;
        a.href = this.buildURL();
        a.target = '_blank';
        a.rel = 'noopener';
        a.ariaLabel = 'Contactar por WhatsApp';
        a.className = 'floating-whatsapp-btn';
        a.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.487 5.235 3.487 8.413 0 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.003 2.011.564 3.935 1.597 5.66l-1.023 3.748 3.826-1.004zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.501-.173 0-.371-.025-.57-.025-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.078 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>`;
        document.body.appendChild(a);
    }
}

/**
 * Clase principal para gestionar toda la aplicación
 * Actúa como un controlador principal que inicializa todos los componentes
 */
class AppManager {
    constructor() {
        this.components = new Map();
        this.isInitialized = false;
    }

    /**
     * Inicializa toda la aplicación
     */
    init() {
        if (this.isInitialized) {
            console.warn('App ya inicializada');
            return;
        }

        try {
            // Asegurar estilos y placeholders globales
            ensureGlobalStyles();
            ensureHeaderFooterPlaceholders();
            this.initializeComponents();
            this.setupGlobalEvents();
            this.isInitialized = true;
            console.log('Aplicación inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
        }
    }

    /**
     * Inicializa todos los componentes de la página
     */
    initializeComponents() {
    // Inicializar Header
        const headerElement = document.querySelector('.header-component');
        if (headerElement) {
            const header = new HeaderComponent(headerElement);
            header.init();
            this.components.set('header', header);
        }

        // Inicializar Footer
        const footerElement = document.querySelector('.footer-component');
        if (footerElement) {
            const footer = new FooterComponent(footerElement);
            footer.init();
            this.components.set('footer', footer);
        }

        // Inicializar todas las tarjetas
        const cardElements = document.querySelectorAll('.card-component');
        cardElements.forEach((cardElement, index) => {
            const card = new CardComponent(cardElement);
            card.init();
            this.components.set(`card-${index}`, card);
        });

    // Inicializar botón flotante de WhatsApp global
    const whatsappBtn = new WhatsAppButtonComponent();
    whatsappBtn.init();
    this.components.set('whatsapp', whatsappBtn);
    }

    /**
     * Configura eventos globales de la aplicación
     */
    setupGlobalEvents() {
        // Manejar cambios de tamaño de ventana
        window.addEventListener('resize', this.handleResize.bind(this));

        // Solo manejar cierre real de la aplicación, no navegación
        window.addEventListener('unload', this.handleBeforeUnload.bind(this));

        // Configurar lazy loading para imágenes
        this.setupLazyLoading();
    }

    /**
     * Maneja el redimensionamiento de la ventana
     */
    handleResize() {
        // Cerrar menú móvil si está abierto y la pantalla es grande
        const header = this.components.get('header');
        if (header && window.innerWidth >= 768 && header.isMenuOpen) {
            header.closeMobileMenu();
        }
    }

    /**
     * Maneja eventos antes de cerrar/cambiar la página
     */
    handleBeforeUnload(event) {
        // Solo limpiar si realmente se está cerrando la ventana/pestaña
        // No durante navegación normal o recargas
        if (event.type === 'beforeunload') {
            // Solo logs de debug, no destruir componentes durante navegación
            console.log('🔄 Página cambiando, manteniendo componentes...');
            return;
        }
        
        // Limpiar componentes solo en cierre real
        console.log('🗑️ Limpiando componentes al cerrar aplicación...');
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
    }

    /**
     * Configura lazy loading para imágenes
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Obtiene un componente específico
     * @param {string} name - Nombre del componente
     * @returns {BaseComponent|null} El componente solicitado
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }
}

/**
 * Función utilitaria para inicializar la aplicación cuando el DOM esté listo
 */
function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Redetectar basePath cuando DOM está listo por si el script fue diferido
            detectBasePath();
            const app = new AppManager();
            app.init();
            
            // Hacer disponible globalmente para debugging
            window.app = app;
        });
    } else {
        detectBasePath();
        const app = new AppManager();
        app.init();
        window.app = app;
    }
}

// Inicializar la aplicación
initializeApp();

/* ============================
     Gamificación: Utilidades comunes
     (IIFE con GameComponents)
     ============================ */
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
