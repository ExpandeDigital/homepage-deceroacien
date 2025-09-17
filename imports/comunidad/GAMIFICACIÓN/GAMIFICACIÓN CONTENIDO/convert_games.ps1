# Script para convertir todos los juegos al nuevo layout
$gameData = @{
    "El Negociador de Alianzas" = @{
        phase = "Herramienta de la Fase 5: Consolidación y Madurez"
        objective = "Desarrollar habilidades de negociación y comunicación estratégica para forjar alianzas B2B exitosas que impulsen el crecimiento del negocio en su etapa de madurez."
        importance = "Saber negociar es fundamental para cerrar acuerdos estratégicos. Una buena negociación crea relaciones a largo plazo; una mala puede destruirlas antes de empezar."
        function = "Este juego te sumerge en una conversación con un socio potencial (IA). Deberás elegir las opciones de diálogo correctas para balancear tus objetivos y los de tu contraparte para llegar a un acuerdo `"ganar-ganar`"."
        purpose = "Para practicar la empatía y la estrategia en un entorno seguro. Te prepara para enfrentar negociaciones reales con más confianza y herramientas para lograr resultados beneficiosos para ambas partes."
    }
    "El Optimizador de Conversiones" = @{
        phase = "Herramienta de la Fase 3: Tracción y P-M Fit"
        objective = "Tomar decisiones de mejora de producto y marketing basadas en datos, no en opiniones, comparando el rendimiento de dos versiones de un mismo elemento."
        importance = "Las pruebas A/B son el motor de la optimización continua. Te permiten mejorar de forma incremental y constante tus tasas de conversión, eliminando las conjeturas."
        function = "Este juego te presenta una página con una tasa de conversión base. Deberás elegir qué elemento probar (título, imagen, etc.) para intentar mejorarla. El juego simula el resultado del test A/B."
        purpose = "Para entrenar tu intuición de optimización y entender que no todos los cambios generan un impacto positivo. Es la práctica ideal para la herramienta H5 (Fase 3): Motor de Pruebas A/B."
    }
    "El Pitch Maestro" = @{
        phase = "Herramienta de la Fase 1: Ideación y Validación"
        objective = "Entrenar la habilidad de síntesis y comunicación efectiva, aprendiendo a estructurar y presentar una idea de negocio de forma clara, concisa y persuasiva en menos de 60 segundos."
        importance = "Un buen `"Elevator Pitch`" puede abrir puertas a clientes, socios e inversores. Es la destilación de todo tu trabajo en un mensaje potente que genera interés inmediato."
        function = "Te presenta un caso de negocio y una serie de `"cartas`" con frases. Tu desafío es seleccionar y ordenar las cartas correctas para construir el pitch más coherente y efectivo antes de que se acabe el tiempo."
        purpose = "Te prepara para comunicar tu propuesta de valor de forma rápida y estructurada en cualquier situación. Es la práctica ideal para luego usar la herramienta H7: Generador de Elevator Pitch del Camino Dorado."
    }
}

Write-Host "Script preparado para convertir archivos al nuevo layout."
Write-Host "Datos de juegos disponibles:"
$gameData.Keys | ForEach-Object { Write-Host "- $_" }
