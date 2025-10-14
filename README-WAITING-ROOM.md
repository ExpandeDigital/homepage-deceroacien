# Sistema de Sala de Espera - Conexión en Vivo

## Descripción
Sistema modular y configurable para salas de espera de reuniones en vivo. Permite múltiples configuraciones de reuniones con diferentes horarios y enlaces.

## Archivos del Sistema

### Archivos CSS
- `assets/styles/waiting-room.css` - Estilos centralizados para la sala de espera

### Archivos JavaScript  
- `assets/js/waiting-room.js` - Clase principal `WaitingRoom` con toda la lógica

### Archivos de Configuración
- `assets/config/meetings.json` - Configuración de reuniones predefinidas

### Archivo HTML
- `conexion-vivo.html` - Página principal de la sala de espera

## Formas de Uso

### 1. Usando Parámetros de URL (Recomendado)

#### Para una reunión inmediata:
```
conexion-vivo.html?date=2025-10-14&time=17:00&url=https://meet.google.com/abc-def-ghi&title=Mi%20Reunión
```

#### Para una reunión mañana:
```
conexion-vivo.html?date=2025-10-15&time=13:00&url=https://zoom.us/j/123456789&title=Masterclass%20CEO
```

### 2. Usando Configuración Predefinida

#### Editar el archivo `assets/config/meetings.json`:
```json
{
  "meetings": {
    "reunion_hoy": {
      "title": "Reunión Estratégica",
      "date": "2025-10-14",
      "time": "17:00",
      "timezone": "America/Montevideo",
      "meetingUrl": "https://meet.google.com/ihf-paiw-baf"
    },
    "masterclass_manana": {
      "title": "Masterclass CEO",
      "date": "2025-10-15", 
      "time": "13:00",
      "timezone": "America/Montevideo",
      "meetingUrl": "https://zoom.us/j/ejemplo"
    }
  }
}
```

#### Luego usar:
```
conexion-vivo.html?meeting=reunion_hoy
conexion-vivo.html?meeting=masterclass_manana
```

### 3. Configuración Dinámica desde Consola

Una vez cargada la página, puedes cambiar la configuración desde la consola del navegador:

```javascript
// Cambiar a una nueva reunión
window.updateMeeting({
    title: "Nueva Reunión",
    date: "2025-10-16",
    time: "19:00",
    meetingUrl: "https://teams.microsoft.com/ejemplo"
});

// Ver estado actual
window.getMeetingStatus();
```

## Parámetros de URL Soportados

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `meeting` | ID de reunión predefinida | `?meeting=bootcamp_pmv` |
| `date` | Fecha de la reunión (YYYY-MM-DD) | `?date=2025-10-14` |
| `time` | Hora de la reunión (HH:MM) | `?time=17:00` |
| `url` | Enlace de la reunión | `?url=https://meet.google.com/abc` |
| `title` | Título personalizado | `?title=Mi%20Reunión` |

## Ejemplos Prácticos

### Ejemplo 1: Reunión de hoy a las 17:00
```
conexion-vivo.html?date=2025-10-14&time=17:00&url=https://meet.google.com/ihf-paiw-baf&title=Reunión%20de%20Estrategia
```

### Ejemplo 2: Masterclass de mañana a las 13:00  
```
conexion-vivo.html?date=2025-10-15&time=13:00&url=https://zoom.us/j/123456789&title=Masterclass%20CEO
```

### Ejemplo 3: Usando configuración predefinida
```
conexion-vivo.html?meeting=bootcamp_pmv
```

## Funcionalidades

### ✅ Funcionalidades Implementadas
- ⏰ Cuenta regresiva automática hasta la hora de reunión
- 🌍 Visualización de zonas horarias múltiples (Montevideo, Santiago, Buenos Aires, Lima, Bogotá)
- 🎵 Música de fondo automática con controles de volumen
- 🔄 Redirección automática al enlace de reunión
- 📱 Diseño responsive para móviles y desktop
- 🎨 Interfaz moderna con colores de la marca
- 🔧 Configuración flexible vía URL o JSON

### 🎛️ Controles de Usuario
- ⏯️ Play/Pause de música de fondo
- 🔊 Control de volumen con barra visual
- 🔇 Botón de mute/unmute
- 📊 Información de estado en tiempo real

### 🕒 Estados de Tiempo
- **Más de 1 hora**: Mensaje de espera relajado
- **30-60 minutos**: Mensaje de preparación
- **5-30 minutos**: Mensaje de proximidad
- **1-5 minutos**: Alerta de inicio próximo
- **< 1 minuto**: Mensaje de conexión inmediata
- **Tiempo cumplido**: Redirección automática

## Configuración de Audio

El sistema incluye música de fondo automática:
- **Archivo**: `assets/audio/sientes-dudas-al-empezar.mp3`
- **Autoplay**: Intenta reproducir automáticamente
- **Controles**: Volumen, mute, play/pause
- **Volumen por defecto**: 25%

## Zonas Horarias Soportadas

El sistema calcula automáticamente las horas locales para:
- 🇺🇾 Montevideo (UTC-3)
- 🇨🇱 Santiago (UTC-3) 
- 🇦🇷 Buenos Aires (UTC-3)
- 🇵🇪 Lima (UTC-5)
- 🇨🇴 Bogotá (UTC-5)

## Solución de Problemas

### Emojis no se ven correctamente
- Verifica que el archivo esté guardado con codificación UTF-8
- Los emojis de banderas están correctamente incluidos en el HTML

### Audio no reproduce automáticamente
- Algunos navegadores bloquean autoplay
- El botón de play aparecerá automáticamente si es necesario
- Los usuarios pueden hacer clic para iniciar la música

### Hora incorrecta
- Verifica el formato de fecha (YYYY-MM-DD) y hora (HH:MM)
- La zona horaria base es America/Montevideo (UTC-3)
- Puedes cambiar la configuración dinámicamente

### Reunión no redirige
- Verifica que el `meetingUrl` sea válido
- La redirección ocurre 2 segundos después de llegar a 00:00:00
- Puedes desactivar la redirección automática con `autoRedirect: false`

## Personalización Avanzada

### Cambiar colores de la marca
Edita `assets/styles/waiting-room.css`:
```css
:root {
    --azul-oscuro: #0A192F;
    --dorado: #FBBF24; 
    /* Modifica estos valores */
}
```

### Agregar nuevas zonas horarias
Edita el archivo `assets/js/waiting-room.js` en la función `updateTimezones()`.

### Cambiar música de fondo
1. Coloca el archivo de audio en `assets/audio/`
2. Especifica la ruta en la configuración: `audioPath: "assets/audio/mi-musica.mp3"`

## Comandos de Consola Útiles

```javascript
// Ver estado actual
window.getMeetingStatus()

// Cambiar reunión (ejemplo para hoy 17:00)
window.updateMeeting({
    date: "2025-10-14", 
    time: "17:00",
    meetingUrl: "https://meet.google.com/nuevo-enlace",
    title: "Mi Nueva Reunión"
})

// Cambiar reunión (ejemplo para mañana 13:00)  
window.updateMeeting({
    date: "2025-10-15",
    time: "13:00", 
    meetingUrl: "https://zoom.us/j/123456789",
    title: "Masterclass CEO"
})
```