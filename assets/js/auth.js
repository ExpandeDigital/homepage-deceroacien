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

        // Si Firebase está disponible, usar el ID token de Google para firmar en Firebase
        if (window.__firebaseAuth && window.firebase && window.firebase.auth && window.firebase.auth.GoogleAuthProvider) {
            (async () => {
                try {
                    const cred = window.firebase.auth.GoogleAuthProvider.credential(response.credential);
                    await window.__firebaseAuth.signInWithCredential(cred);
                    // Sincronizar enrollments y redirigir
                    if (window.firebaseAuthHelpers && window.firebaseAuthHelpers.manualSync) {
                        try { await window.firebaseAuthHelpers.manualSync(); } catch(_) {}
                    }
                    if (window.authManager && typeof window.authManager.redirectAfterAuth === 'function') {
                        window.authManager.redirectAfterAuth();
                    }
                } catch (err) {
                    console.error('Error vinculando Google con Firebase:', err);
                    // Fallback: intentar con Popup
                    try {
                        const provider = new window.firebase.auth.GoogleAuthProvider();
                        await window.__firebaseAuth.signInWithPopup(provider);
                        if (window.firebaseAuthHelpers && window.firebaseAuthHelpers.manualSync) {
                            try { await window.firebaseAuthHelpers.manualSync(); } catch(_) {}
                        }
                        if (window.authManager && typeof window.authManager.redirectAfterAuth === 'function') {
                            window.authManager.redirectAfterAuth();
                        }
                    } catch (e2) {
                        console.error('Fallback signInWithPopup también falló:', e2);
                    }
                }
            })();
        }
        
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

        // Si Firebase está disponible, iniciar sesión con credential
        if (window.__firebaseAuth && window.firebase && window.firebase.auth && window.firebase.auth.GoogleAuthProvider) {
            try {
                // Nota: el token original está en googleUser.originalToken si se requiere
                const cred = window.firebase.auth.GoogleAuthProvider.credential(googleUser.originalToken);
                await window.__firebaseAuth.signInWithCredential(cred);
                if (window.firebaseAuthHelpers && window.firebaseAuthHelpers.manualSync) {
                    try { await window.firebaseAuthHelpers.manualSync(); } catch(_) {}
                }
                this.redirectAfterAuth();
                return;
            } catch (e) {
                console.warn('Fallo signInWithCredential, intento Popup', e);
                try {
                    const provider = new window.firebase.auth.GoogleAuthProvider();
                    await window.__firebaseAuth.signInWithPopup(provider);
                    if (window.firebaseAuthHelpers && window.firebaseAuthHelpers.manualSync) {
                        try { await window.firebaseAuthHelpers.manualSync(); } catch(_) {}
                    }
                    this.redirectAfterAuth();
                    return;
                } catch (e2) {
                    console.warn('Popup también falló, usando flujo simulado', e2);
                }
            }
        }

        // Fallback simulado previo (no Firebase)
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

// =============================
// Integración Firebase Auth (opcional)
// =============================
(function(){
    function attachFirebaseIntegration(){
        if (!window.__firebaseAuth) return; // Aún no inicializado por firebase-client
        const fbAuth = window.__firebaseAuth;
        // Estado de conocimiento de auth
        window.__firebaseAuthKnown = false;

        async function syncServerEntitlements(idToken){
            try {
                // Construir URL del backend (prod/dev) desde PublicAuthConfig si está disponible
                const api = (window.PublicAuthConfig && window.PublicAuthConfig.api) || null;
                const mePath = (api && api.endpoints && api.endpoints.me) ? api.endpoints.me : '/auth/me';
                const url = api && api.baseUrl ? (api.baseUrl + mePath) : ('/api' + mePath);
                const verifyPath = (api && api.endpoints && api.endpoints.verify) ? api.endpoints.verify : '/auth/verify';
                const verifyUrl = api && api.baseUrl ? (api.baseUrl + verifyPath) : ('/api' + verifyPath);

                // 1) Intentar provisionar/verificar usuario en backend (idempotente)
                try {
                    await fetch(verifyUrl, {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + idToken, 'Accept': 'application/json' },
                        body: null
                    });
                } catch(_) { /* si falla, seguimos, el backend puede no requerirlo */ }

                // 2) Consultar /auth/me con pequeños reintentos (por eventual consistencia)
                const fetchMe = async () => fetch(url, { headers: { 'Authorization': 'Bearer ' + idToken, 'Accept': 'application/json' } });
                let resp = await fetchMe();
                if (!resp.ok && !(window.Environment && window.Environment.isDevelopment)) {
                    // reintentos cortos en prod
                    for (let i=0;i<2 && !resp.ok;i++) {
                        await new Promise(r=> setTimeout(r, 400*(i+1)));
                        resp = await fetchMe();
                    }
                }
                if (!resp.ok) {
                    // Fallback de desarrollo: si no hay backend local, usar datos de Firebase para habilitar sesión local
                    try {
                        const isDev = !!(window.Environment && window.Environment.isDevelopment);
                        const u = fbAuth && fbAuth.currentUser;
                        if (isDev && u) {
                            const pref = (localStorage.getItem('deceroacien_avatar_pref') || 'male').toLowerCase();
                            const fallbackAvatar = pref === 'female' ? '/assets/female-avatar.png' : '/assets/male-avatar.png';
                            const simpleUser = {
                                id: u.uid,
                                email: u.email || (u.providerData && u.providerData[0] && u.providerData[0].email) || '',
                                firstName: (u.displayName && u.displayName.split(' ')[0]) || 'Usuario',
                                lastName: (u.displayName && u.displayName.split(' ').slice(1).join(' ')) || '',
                                profilePicture: (u.photoURL) || fallbackAvatar
                            };
                            localStorage.setItem(AuthConfig.storage.userKey, JSON.stringify(simpleUser));
                            localStorage.setItem(AuthConfig.storage.tokenKey, idToken);
                            if (window.authManager) {
                                window.authManager.currentUser = simpleUser;
                                window.authManager.isAuthenticated = true;
                            }
                            console.warn('[dev-fallback] /api/auth/me no disponible; usando datos de Firebase para sesión local.');
                        }
                    } catch(_e) {}
                    // En producción: mostrar notificación visible
                    if (!(window.Environment && window.Environment.isDevelopment)) {
                        const msg = 'No se pudo obtener tu perfil desde el servidor (status ' + (resp.status||'') + ').';
                        if (window.authManager && window.authManager.showError) window.authManager.showError(msg);
                    }
                    return; // terminar sin romper flujo local
                }
                const data = await resp.json();
                if (data && data.enrollments && Array.isArray(data.enrollments)) {
                    if (window.entitlements && window.entitlements.setAll) {
                        window.entitlements.setAll(data.enrollments);
                    } else {
                        // fallback directo localStorage
                        localStorage.setItem('deceroacien_entitlements', JSON.stringify(data.enrollments));
                        localStorage.setItem('deceroacien_entitlements_updated', Date.now().toString());
                    }
                }
                // Persist simple user for UI reuse
                if (data.user) {
                    // Enriquecer con foto del usuario de Firebase si existe; si no, aplicar preferencia de avatar genérico
                    const uFb = (typeof fbAuth !== 'undefined' && fbAuth && fbAuth.currentUser) ? fbAuth.currentUser : null;
                    let picture = (uFb && uFb.photoURL) || data.user.photo_url || data.user.picture || '';
                    if (!picture) {
                        const pref = (localStorage.getItem('deceroacien_avatar_pref') || 'male').toLowerCase();
                        picture = pref === 'female' ? '/assets/female-avatar.png' : '/assets/male-avatar.png';
                    }
                    const simpleUser = {
                        id: data.user.id,
                        email: data.user.email,
                        firebase_uid: data.user.firebase_uid,
                        firstName: data.user.first_name,
                        lastName: data.user.last_name,
                        profilePicture: picture
                    };
                    localStorage.setItem(AuthConfig.storage.userKey, JSON.stringify(simpleUser));
                    localStorage.setItem(AuthConfig.storage.tokenKey, idToken);
                    if (window.authManager) {
                        window.authManager.currentUser = simpleUser;
                        window.authManager.isAuthenticated = true;
                    }
                }
            } catch(e){ console.warn('syncServerEntitlements error', e); }
        }

        fbAuth.onAuthStateChanged(async (user)=>{
            window.__firebaseAuthKnown = true;
            if (user) {
                try {
                    const idToken = await user.getIdToken(/* forceRefresh */ true);
                    await syncServerEntitlements(idToken);
                } catch(e){ console.error('Error obteniendo idToken Firebase', e); }
            } else {
                // sign out
                localStorage.removeItem(AuthConfig.storage.userKey);
                localStorage.removeItem(AuthConfig.storage.tokenKey);
                if (window.authManager){
                    window.authManager.currentUser = null;
                    window.authManager.isAuthenticated = false;
                }
            }
        });

        // Exponer helpers
        window.firebaseAuthHelpers = {
            async loginEmailPassword(email, password){
                await fbAuth.signInWithEmailAndPassword(email, password);
                const user = fbAuth.currentUser;
                const token = user ? await user.getIdToken() : null;
                return { success: true, token };
            },
            async registerEmailPassword(email, password){
                await fbAuth.createUserWithEmailAndPassword(email, password);
                const user = fbAuth.currentUser;
                const token = user ? await user.getIdToken() : null;
                return { success: true, token };
            },
            async logout(){
                await fbAuth.signOut();
            },
            async getToken(){
                const user = fbAuth.currentUser;
                if (!user) return null;
                return user.getIdToken();
            },
            async manualSync(){
                const user = fbAuth.currentUser;
                if (!user) return;
                const t = await user.getIdToken(true);
                await syncServerEntitlements(t);
            }
        };

        // Parchear métodos existentes del AuthManager si existe
        if (window.authManager) {
            const mgr = window.authManager;
            mgr.authenticateUser = async function(email, password){
                try {
                    const r = await window.firebaseAuthHelpers.loginEmailPassword(email, password);
                    if (r.success) {
                        const token = await window.firebaseAuthHelpers.getToken();
                        return { success: true, user: { email }, token };
                    }
                } catch(e){
                    return { success:false, message: e.message };
                }
                return { success:false, message: 'login_failed' };
            };
            mgr.registerUser = async function(data){
                try {
                    const r = await window.firebaseAuthHelpers.registerEmailPassword(data.email, data.password);
                    if (r.success) {
                        const token = await window.firebaseAuthHelpers.getToken();
                        return { success: true, user: { email: data.email }, token };
                    }
                } catch(e){
                    return { success:false, message: e.message };
                }
                return { success:false };
            };
            mgr.logout = async function(){
                try { await window.firebaseAuthHelpers.logout(); } catch(_) {}
                mgr.clearSession();
                const currentPath = window.location.pathname;
                window.location.href = currentPath.includes('/auth/') ? '../index.html' : '/index.html';
            };
        }
    }

    // Inicializa inmediatamente si ya está listo; si no, engancha al evento del loader centralizado
    if (window.__firebaseAuth) {
        attachFirebaseIntegration();
    } else {
        document.addEventListener('firebase:sdk-ready', function(){
            // Pequeño delay para permitir que firebase-client inicialice __firebaseAuth tras el evento
            setTimeout(attachFirebaseIntegration, 0);
        }, { once: true });
    }
})();
