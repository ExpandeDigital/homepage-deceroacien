/**
 * SISTEMA DE AUTENTICACIÓN CON GOOGLE OAUTH
 * 
 * Este archivo maneja toda la lógica de autenticación del sitio,
 * incluyendo login/registro tradicional y Google OAuth.
 * 
 * FUNCIONALIDADES:
 * - Autenticación con Google OAuth 2.0
 * - Login y registro tradicional
 * - Gestión de sesiones
 * - Validación de formularios
 * - Redirección automática
 */

// Configuración global de autenticación (usando configuración pública)
const AuthConfig = window.PublicAuthConfig || {
    // Fallback básico - las credenciales reales vienen de config-secure.js
    redirectUrls: {
        dashboard: '/auth/dashboard.html',
        default: '/index.html'
    },
    storage: {
        userKey: 'deceroacien_user',
        tokenKey: 'deceroacien_token',
        sessionKey: 'deceroacien_session'
    }
};

/**
 * CLASE PRINCIPAL DE AUTENTICACIÓN
 */
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Verificar si hay una sesión activa al cargar
        this.checkExistingSession();
        
        // Inicializar event listeners
        this.initializeEventListeners();
    }

    /**
     * Verifica si existe una sesión activa
     */
    checkExistingSession() {
        try {
            const userData = localStorage.getItem(AuthConfig.storage.userKey);
            const token = localStorage.getItem(AuthConfig.storage.tokenKey);
            
            if (userData && token) {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                console.log('Sesión activa encontrada:', this.currentUser);
            }
        } catch (error) {
            console.error('Error al verificar sesión existente:', error);
            this.clearSession();
        }
    }

    /**
     * Inicializa los event listeners para formularios
     */
    initializeEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Logout buttons (si existen en otras páginas)
        const logoutButtons = document.querySelectorAll('[data-logout]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', () => this.logout());
        });
    }

    /**
     * Maneja el login tradicional
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember-me');

        // Validación básica
        if (!email || !password) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Por favor ingresa un email válido');
            return;
        }

        try {
            this.showLoading('loginButton', 'Iniciando sesión...');
            
            // Aquí iría la llamada a tu API de backend
            const response = await this.authenticateUser(email, password);
            
            if (response.success) {
                this.handleSuccessfulAuth(response.user, response.token, remember);
            } else {
                this.showError(response.message || 'Credenciales incorrectas');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error al iniciar sesión. Inténtalo de nuevo.');
        } finally {
            this.hideLoading('loginButton', 'Iniciar Sesión');
        }
    }

    /**
     * Maneja el registro tradicional
     */
    async handleRegister(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            company: formData.get('company'),
            terms: formData.get('terms'),
            newsletter: formData.get('newsletter')
        };

        // Validaciones
        if (!this.validateRegistrationData(userData)) {
            return;
        }

        try {
            this.showLoading('registerButton', 'Creando cuenta...');
            
            // Aquí iría la llamada a tu API de backend
            const response = await this.registerUser(userData);
            
            if (response.success) {
                this.showSuccess('Cuenta creada exitosamente. ¡Bienvenido!');
                this.handleSuccessfulAuth(response.user, response.token);
            } else {
                this.showError(response.message || 'Error al crear la cuenta');
            }
        } catch (error) {
            console.error('Error en registro:', error);
            this.showError('Error al crear la cuenta. Inténtalo de nuevo.');
        } finally {
            this.hideLoading('registerButton', 'Crear Cuenta');
        }
    }

    /**
     * Valida los datos de registro
     */
    validateRegistrationData(data) {
        if (!data.firstName || !data.lastName || !data.email || !data.password) {
            this.showError('Por favor completa todos los campos obligatorios');
            return false;
        }

        if (!this.isValidEmail(data.email)) {
            this.showError('Por favor ingresa un email válido');
            return false;
        }

        if (!this.isValidPassword(data.password)) {
            this.showError('La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números');
            return false;
        }

        if (data.password !== data.confirmPassword) {
            this.showError('Las contraseñas no coinciden');
            return false;
        }

        if (!data.terms) {
            this.showError('Debes aceptar los términos y condiciones');
            return false;
        }

        return true;
    }

    /**
     * Valida formato de email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Valida complejidad de contraseña
     */
    isValidPassword(password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    /**
     * Simula autenticación (reemplazar con API real)
     */
    async authenticateUser(email, password) {
        // Simulación de delay de red
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Aquí iría tu lógica real de autenticación
        // Por ahora, simulamos una respuesta exitosa para demo
        if (email === 'demo@deceroacien.app' && password === 'demo123') {
            return {
                success: true,
                user: {
                    id: '1',
                    email: email,
                    firstName: 'Usuario',
                    lastName: 'Demo',
                    company: 'DE CERO A CIEN'
                },
                token: 'demo_token_' + Date.now()
            };
        }
        
        return {
            success: false,
            message: 'Credenciales incorrectas'
        };
    }

    /**
     * Simula registro (reemplazar con API real)
     */
    async registerUser(userData) {
        // Simulación de delay de red
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Aquí iría tu lógica real de registro
        // Por ahora, simulamos una respuesta exitosa
        return {
            success: true,
            user: {
                id: Date.now().toString(),
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                company: userData.company || ''
            },
            token: 'new_user_token_' + Date.now()
        };
    }

    /**
     * Maneja autenticación exitosa
     */
    handleSuccessfulAuth(user, token, remember = false) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Guardar en localStorage
        localStorage.setItem(AuthConfig.storage.userKey, JSON.stringify(user));
        localStorage.setItem(AuthConfig.storage.tokenKey, token);
        
        if (remember) {
            localStorage.setItem(AuthConfig.storage.sessionKey, 'persistent');
        }
        
        console.log('Autenticación exitosa:', user);
        
        // Redireccionar
        this.redirectAfterAuth();
    }

    /**
     * Redirige después de autenticación exitosa
     */
    redirectAfterAuth() {
        // Obtener URL de retorno si existe
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('return');
        
        if (returnUrl) {
            window.location.href = decodeURIComponent(returnUrl);
        } else {
            // Determinar la ruta correcta según la ubicación actual
            const currentPath = window.location.pathname;
            let redirectPath;
            
            if (currentPath.includes('/auth/')) {
                // Estamos en una página de auth, usar ruta relativa
                redirectPath = 'dashboard.html';
            } else {
                // Estamos en otra página, usar ruta absoluta
                redirectPath = '/auth/dashboard.html';
            }
            
            window.location.href = redirectPath;
        }
    }

    /**
     * Cierra sesión
     */
    logout() {
        this.clearSession();
        
        // Determinar la ruta correcta según la ubicación actual
        const currentPath = window.location.pathname;
        let redirectPath;
        
        if (currentPath.includes('/auth/')) {
            // Estamos en una página de auth, usar ruta relativa
            redirectPath = '../index.html';
        } else {
            // Estamos en otra página, usar ruta absoluta
            redirectPath = '/index.html';
        }
        
        window.location.href = redirectPath;
    }

    /**
     * Limpia la sesión
     */
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem(AuthConfig.storage.userKey);
        localStorage.removeItem(AuthConfig.storage.tokenKey);
        localStorage.removeItem(AuthConfig.storage.sessionKey);
    }

    /**
     * Muestra estado de carga en botón
     */
    showLoading(buttonId, loadingText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-black inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ${loadingText}
            `;
        }
    }

    /**
     * Oculta estado de carga en botón
     */
    hideLoading(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    /**
     * Muestra mensaje de error
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Sistema de notificaciones
     */
    showNotification(message, type = 'info') {
        // Remover notificación existente si hay una
        const existingNotification = document.getElementById('auth-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'auth-notification';
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
            type === 'error' ? 'bg-red-600 text-white' :
            type === 'success' ? 'bg-green-600 text-white' :
            'bg-blue-600 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <div class="ml-auto pl-3">
                    <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                        <span class="sr-only">Cerrar</span>
                        ✖
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verifica si el usuario está autenticado
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

/**
 * FUNCIONES PARA GOOGLE OAUTH - SIGUIENDO DOCUMENTACIÓN OFICIAL
 */

/**
 * Maneja la respuesta de credenciales de Google OAuth
 * Implementación completa según documentación oficial de Google Identity Services
 * 
 * @param {Object} response - Respuesta de Google que contiene el JWT credential
 */
function handleCredentialResponse(response) {
    try {
        console.log("Encoded JWT ID token: " + response.credential);
        
        // Decodificar el JWT usando la función mejorada
        const responsePayload = decodeJwtResponse(response.credential);
        
        if (!responsePayload) {
            throw new Error('No se pudo decodificar el token de Google');
        }
        
        // Log de información del usuario según ejemplos de Google
        console.log("ID: " + responsePayload.sub);
        console.log('Full Name: ' + responsePayload.name);
        console.log('Given Name: ' + responsePayload.given_name);
        console.log('Family Name: ' + responsePayload.family_name);
        console.log("Image URL: " + responsePayload.picture);
        console.log("Email: " + responsePayload.email);
        console.log("Email Verified: " + responsePayload.email_verified);
        
        // Crear objeto de usuario estructurado para nuestro sistema
        const googleUser = {
            // Identificadores
            id: responsePayload.sub,
            googleId: responsePayload.sub,
            
            // Información personal
            email: responsePayload.email,
            firstName: responsePayload.given_name || '',
            lastName: responsePayload.family_name || '',
            fullName: responsePayload.name || '',
            profilePicture: responsePayload.picture || '',
            
            // Estados y verificaciones
            emailVerified: responsePayload.email_verified || false,
            authProvider: 'google',
            
            // Metadatos del token
            iss: responsePayload.iss,
            aud: responsePayload.aud,
            exp: responsePayload.exp,
            iat: responsePayload.iat,
            
            // Token original para verificación en backend
            originalToken: response.credential
        };
        
        // Procesar autenticación con nuestro sistema
        if (window.authManager) {
            window.authManager.handleGoogleAuth(googleUser);
        } else {
            // Fallback si authManager no está disponible aún
            console.warn('AuthManager no disponible, inicializando...');
            
            // Esperar un poco e intentar de nuevo
            setTimeout(() => {
                if (window.authManager) {
                    window.authManager.handleGoogleAuth(googleUser);
                } else {
                    // Crear authManager si no existe
                    window.authManager = new AuthManager();
                    window.authManager.handleGoogleAuth(googleUser);
                }
            }, 100);
        }
        
    } catch (error) {
        console.error('Error en handleCredentialResponse:', error);
        
        // Mostrar error user-friendly
        if (window.authManager) {
            window.authManager.showError('Error al procesar autenticación con Google: ' + error.message);
        } else {
            alert('Error al autenticar con Google. Por favor, inténtalo de nuevo.');
        }
    }
}

/**
 * Función de decodificación JWT mejorada según documentación oficial de Google
 * Basada en: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 * 
 * IMPORTANTE: Esta función solo decodifica el token para obtener la información del usuario.
 * En producción, SIEMPRE debes verificar el token en tu servidor backend.
 */
function decodeJwtResponse(token) {
    try {
        // Validar formato del token
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Token JWT inválido: formato incorrecto');
        }
        
        // Obtener el payload (segunda parte del token)
        let base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Agregar padding si es necesario para decodificación base64
        while (base64.length % 4) {
            base64 += '=';
        }
        
        // Decodificar base64 y convertir a UTF-8
        let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        
        // Validaciones básicas según especificaciones de Google
        if (!payload.sub) {
            throw new Error('Token inválido: falta subject (sub)');
        }
        
        if (!payload.email) {
            throw new Error('Token inválido: falta email');
        }
        
        if (!payload.iss || (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com')) {
            throw new Error('Token inválido: emisor no es Google');
        }
        
        // Verificar expiración (básica - en producción hacer en backend)
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            throw new Error('Token expirado');
        }
        
        console.log('Token JWT decodificado correctamente');
        return payload;
        
    } catch (error) {
        console.error('Error decodificando JWT:', error);
        return null;
    }
}

/**
 * Agrega método para manejar autenticación con Google
 */
AuthManager.prototype.handleGoogleAuth = async function(googleUser) {
    try {
        this.showLoading('g_id_signin', 'Procesando...');
        
        // Aquí deberías enviar los datos de Google a tu backend
        // para crear/verificar el usuario y obtener un token de tu sistema
        const response = await this.processGoogleAuth(googleUser);
        
        if (response.success) {
            this.handleSuccessfulAuth(response.user, response.token);
        } else {
            this.showError(response.message || 'Error al autenticar con Google');
        }
    } catch (error) {
        console.error('Error en autenticación con Google:', error);
        this.showError('Error al procesar autenticación con Google');
    }
};

/**
 * Procesa autenticación con Google (simulated - reemplazar con API real)
 */
AuthManager.prototype.processGoogleAuth = async function(googleUser) {
    // Simulación de delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Aquí iría tu lógica real para procesar usuarios de Google
    return {
        success: true,
        user: {
            id: googleUser.id,
            email: googleUser.email,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            profilePicture: googleUser.profilePicture,
            authProvider: 'google'
        },
        token: 'google_auth_token_' + Date.now()
    };
};

/**
 * Inicializar el gestor de autenticación cuando se carga la página
 */
let authManager;

// Función de inicialización robusta
function initializeAuthManager() {
    if (!authManager) {
        authManager = new AuthManager();
        window.authManager = authManager;
        console.log('Sistema de autenticación inicializado');
    }
    return authManager;
}

// Inicialización múltiple para asegurar disponibilidad
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthManager();
});

// Inicialización inmediata si el DOM ya está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthManager);
} else {
    initializeAuthManager();
}

// Asegurar que esté disponible globalmente
window.initializeAuthManager = initializeAuthManager;

/**
 * FUNCIONES UTILITY PARA PROTEGER PÁGINAS
 */

/**
 * Protege una página requiriendo autenticación
 */
function requireAuth() {
    if (!authManager || !authManager.isUserAuthenticated()) {
        const currentUrl = encodeURIComponent(window.location.href);
        const currentPath = window.location.pathname;
        let loginPath;
        
        if (currentPath.includes('/auth/')) {
            // Estamos en una página de auth, usar ruta relativa
            loginPath = `login.html?return=${currentUrl}`;
        } else {
            // Estamos en otra página, usar ruta absoluta
            loginPath = `/auth/login.html?return=${currentUrl}`;
        }
        
        window.location.href = loginPath;
        return false;
    }
    return true;
}

/**
 * Redirige usuarios autenticados lejos de páginas de auth
 */
function redirectIfAuthenticated() {
    if (authManager && authManager.isUserAuthenticated()) {
        const currentPath = window.location.pathname;
        let dashboardPath;
        
        if (currentPath.includes('/auth/')) {
            // Estamos en una página de auth, usar ruta relativa
            dashboardPath = 'dashboard.html';
        } else {
            // Estamos en otra página, usar ruta absoluta
            dashboardPath = '/auth/dashboard.html';
        }
        
        window.location.href = dashboardPath;
        return true;
    }
    return false;
}

// Exponer funciones globalmente si es necesario
window.authManager = authManager;
window.requireAuth = requireAuth;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.handleCredentialResponse = handleCredentialResponse;
