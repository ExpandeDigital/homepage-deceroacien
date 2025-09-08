# Script para unificar headers y footers en conferencias

# Lista de archivos de conferencias a procesar
$conferenciaFiles = @(
    "conferencia_soledad_estratega.html",
    "conferencia_maquina_crecimiento.html"
)

foreach ($file in $conferenciaFiles) {
    $filePath = "c:\Users\cjofr\Desktop\IGNACIO\homepage-deceroacien\$file"
    
    if (Test-Path $filePath) {
        Write-Host "Procesando $file..."
        
        # Leer contenido del archivo
        $content = Get-Content $filePath -Raw
        
        # Reemplazar header complejo con header simple
        $headerPattern = '(?s)(\s*<!-- HEADER UNIFICADO -->\s*<header class="header-component">).*?(<\/header>)'
        $headerReplacement = '$1' + "`n        <!-- El contenido del header se genera dinamicamente por JavaScript -->`n    " + '$2'
        $content = $content -replace $headerPattern, $headerReplacement
        
        # Reemplazar main tag para agregar main-content class
        $mainPattern = '(?s)(<\/header>\s*)<main>'
        $mainReplacement = '$1' + "`n`n    <main class=""main-content"">"
        $content = $content -replace $mainPattern, $mainReplacement
        
        # Unificar clases de contenedor
        $content = $content -replace 'container mx-auto', 'section-container'
        $content = $content -replace 'px-6', ''
        
        # Unificar clases de sección
        $content = $content -replace 'py-20 sm:py-24', 'main-section py-20 sm:py-24'
        
        # Guardar archivo modificado
        $content | Set-Content $filePath -NoNewline
        
        Write-Host "Convertido: $file"
    } else {
        Write-Host "No encontrado: $file"
    }
}

Write-Host "Conversion completada para conferencias."
