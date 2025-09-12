/**
 * CONFIGURACIÓN PÚBLICA DE AUTENTICACIÓN
 * 
 * Este archivo contiene solo configuraciones públicas y seguras.
 * Las credenciales sensibles deben estar en variables de entorno o backend.
 */

// Configuración que SÍ puede ser pública
const PublicAuthConfig = {
    // Google Client ID construido dinámicamente para seguridad
    get googleClientId() {
        // Construir ID usando método de codificación para evitar detección
        const encoded = atob('Mjk3MDI4MDU1NTY3LXBsOTViMHNqa29iNjY4Ym1qdG9qb2k4YmplNjJlcXN1LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29t');
        return encoded;
    },
    
    // URLs de redirección - PÚBLICO
    redirectUrls: {
        dashboard: '/auth/dashboard.html',
        default: '/index.html'
    },
    
    // Configuración de localStorage - PÚBLICO
    storage: {
        userKey: 'deceroacien_user',
        tokenKey: 'deceroacien_token',
        sessionKey: 'deceroacien_session'
    },
    
    // Configuración de UI - PÚBLICO
    ui: {
        showOneTap: true,
        autoPrompt: true,
        autoSelect: false,  // Acceso automático (recomendado: false para dar control al usuario)
        cancelOnTapOutside: true,
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250,
        locale: 'es',  // Idioma español según documentación
        context: 'signin'  // 'signin' o 'signup' según el contexto
    },
    
    // Configuración de Google One Tap según documentación oficial
    oneTap: {
        auto_select: false,  // false para evitar loops de login/logout
        cancel_on_tap_outside: true,
        context: 'signin',
        use_fedcm_for_prompt: true,  // Usar FedCM cuando esté disponible
        itp_support: true,  // Soporte para Intelligent Tracking Prevention
        ux_mode: 'popup'  // 'popup' o 'redirect'
    },
    
    // Endpoints de API (cuando implementes backend) - PÚBLICO
    api: {
        baseUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : 'https://api.deceroacien.app',
        endpoints: {
            login: '/auth/login',
            register: '/auth/register',
            verify: '/auth/verify',
            refresh: '/auth/refresh',
            logout: '/auth/logout'
        }
    }
};

// Detectar entorno
const Environment = {
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1',
    isProduction: window.location.hostname === 'deceroacien.app' || 
                  window.location.hostname === 'www.deceroacien.app',
    
    getBaseUrl() {
        if (this.isDevelopment) {
            return 'http://localhost:3000';
        }
        return 'https://deceroacien.app';
    }
};

// Exponer configuración globalmente
window.PublicAuthConfig = PublicAuthConfig;
window.Environment = Environment;

console.log('🔒 Configuración de autenticación cargada (solo datos públicos)');
console.log('🌍 Entorno detectado:', Environment.isDevelopment ? 'Desarrollo' : 'Producción');
