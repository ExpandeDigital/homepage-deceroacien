/**
 * SISTEMA DE COMPONENTES JAVASCRIPT
 * Implementa programación orientada a objetos para componentes reutilizables
 * Maneja la lógica común de header, footer y otros elementos interactivos
 */

/**
 * Clase base para todos los componentes
 * Proporciona funcionalidad común y estructura base
 */
class BaseComponent {
    constructor(element) {
        this.element = element;
        this.isInitialized = false;
    }

    /**
     * Método para inicializar el componente
     * Debe ser sobrescrito por las clases hijas
     */
    init() {
        if (this.isInitialized) {
            console.warn('Componente ya inicializado');
            return;
        }
        this.isInitialized = true;
        this.bindEvents();
    }

    /**
     * Método para vincular eventos
     * Debe ser sobrescrito por las clases hijas si necesita eventos
     */
    bindEvents() {
        // Implementación por defecto vacía
    }

    /**
     * Método para destruir el componente y limpiar eventos
     */
    destroy() {
        if (this.element) {
            this.element.removeEventListener('click', this.handleClick);
        }
        this.isInitialized = false;
    }
}

/**
 * Clase para manejar el componente Header
 * Extiende BaseComponent para heredar funcionalidad común
 */
class HeaderComponent extends BaseComponent {
    constructor(element) {
        super(element);
        this.mobileMenuButton = null;
        this.mobileMenu = null;
        this.isMenuOpen = false;
        this.currentPage = this.getCurrentPage();
    }

    /**
     * Determina la página actual basada en la URL
     * @returns {string} Nombre de la página actual
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        return filename.replace('.html', '');
    }

    /**
     * Inicializa el header y establece el enlace activo
     */
    init() {
        super.init();
        this.setActiveLink();
        this.createMobileMenu();
        console.log('Header inicializado correctamente');
    }

    /**
     * Establece el enlace activo basado en la página actual
     */
    setActiveLink() {
        const links = this.element.querySelectorAll('.header-link');
        links.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href) {
                const linkPage = href.replace('.html', '');
                if (linkPage === this.currentPage || 
                    (this.currentPage === 'index' && linkPage === 'index')) {
                    link.classList.add('active');
                }
            }
        });
    }

    /**
     * Crea el menú móvil si no existe
     */
    createMobileMenu() {
        // Si ya existe un menú móvil, no lo creamos de nuevo
        if (this.element.querySelector('.mobile-menu')) {
            return;
        }

        const nav = this.element.querySelector('.header-nav');
        if (!nav) return;

        // Crear botón de menú móvil
        const mobileButton = document.createElement('button');
        mobileButton.className = 'mobile-menu-button mobile-only';
        mobileButton.innerHTML = `
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        `;
        mobileButton.setAttribute('aria-label', 'Abrir menú de navegación');

        // Crear menú móvil
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        mobileMenu.innerHTML = this.getMobileMenuHTML();

        nav.appendChild(mobileButton);
        nav.appendChild(mobileMenu);

        this.mobileMenuButton = mobileButton;
        this.mobileMenu = mobileMenu;
    }

    /**
     * Genera el HTML del menú móvil
     * @returns {string} HTML del menú móvil
     */
    getMobileMenuHTML() {
        return `
            <div class="mobile-menu-content">
                <a href="index.html" class="mobile-menu-link">Inicio</a>
                <a href="nosotros.html" class="mobile-menu-link">Nosotros</a>
                <a href="servicios.html" class="mobile-menu-link">Servicios</a>
                <a href="metodologia.html" class="mobile-menu-link">Metodología</a>
                <a href="contacto.html" class="mobile-menu-link">Contacto</a>
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
        if (this.mobileMenuButton) {
            this.mobileMenuButton.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Cerrar menú al hacer clic en un enlace
        if (this.mobileMenu) {
            this.mobileMenu.addEventListener('click', (e) => {
                if (e.target.classList.contains('mobile-menu-link')) {
                    this.closeMobileMenu();
                }
            });
        }

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && 
                !this.mobileMenu.contains(e.target) && 
                !this.mobileMenuButton.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
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
 * Clase para manejar el componente Footer
 * Maneja la funcionalidad específica del footer
 */
class FooterComponent extends BaseComponent {
    constructor(element) {
        super(element);
        this.currentYear = new Date().getFullYear();
    }

    /**
     * Inicializa el footer
     */
    init() {
        super.init();
        this.updateCopyright();
        this.handleExternalLinks();
        console.log('Footer inicializado correctamente');
    }

    /**
     * Actualiza el año en el copyright
     */
    updateCopyright() {
        const copyrightElement = this.element.querySelector('.footer-copyright');
        if (copyrightElement) {
            copyrightElement.textContent = `© ${this.currentYear} DE CERO A CIEN. Todos los derechos reservados.`;
        }
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
    }

    /**
     * Configura eventos globales de la aplicación
     */
    setupGlobalEvents() {
        // Manejar cambios de tamaño de ventana
        window.addEventListener('resize', this.handleResize.bind(this));

        // Manejar navegación
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

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
    handleBeforeUnload() {
        // Limpiar componentes antes de cerrar
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
            const app = new AppManager();
            app.init();
            
            // Hacer disponible globalmente para debugging
            window.app = app;
        });
    } else {
        const app = new AppManager();
        app.init();
        window.app = app;
    }
}

// Inicializar la aplicación
initializeApp();
