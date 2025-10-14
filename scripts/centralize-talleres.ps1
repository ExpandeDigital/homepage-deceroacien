# Script para centralizar los talleres de Formación Semilla
# Actualiza CSS, clases y scripts para usar el sistema centralizado

$talleres = @(
    "TALLER 04 - FORMACIÓN SEMILLA\taller-04.html",
    "TALLER 05 - FORMACIÓN SEMILLA\taller-05.html"
)

$basePath = "c:\Users\cjofr\Desktop\IGNACIO\homepage-deceroacien\formacion-semilla-talleres"

foreach ($taller in $talleres) {
    $filePath = Join-Path $basePath $taller
    Write-Host "Procesando: $filePath"
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Actualizar CSS y head
        $content = $content -replace 'href="https://fonts\.googleapis\.com/css2\?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">\s*<style>body\{font-family:\'Inter\',sans-serif;background:#0a1f2f;color:#e6f1ff\}\.card\{background:#112240;border:1px solid #1e2d4d\}</style>', 'rel="stylesheet" href="../../assets/styles/formacion-semilla.css">'
        
        # Actualizar body
        $content = $content -replace '<body>', '<body class="fs-body">'
        
        # Actualizar contenedor principal
        $content = $content -replace 'container mx-auto max-w-4xl px-6', 'fs-container'
        
        # Actualizar secciones
        $content = $content -replace 'bg-\[#112240\] border border-\[#1e2d4d\] rounded-xl p-8( mb-8)?', 'fs-card'
        
        # Actualizar títulos de sección
        $content = $content -replace 'text-2xl font-bold text-yellow-400 mb-4', 'fs-section-title'
        
        # Actualizar cajas de contenido
        $content = $content -replace 'bg-gray-800 rounded-lg p-6', 'fs-content-box'
        
        # Actualizar botones primarios
        $content = $content -replace 'inline-block bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-lg font-bold transition-colors', 'fs-btn fs-btn-primary'
        
        # Actualizar cajas destacadas
        $content = $content -replace 'bg-gradient-to-r from-[a-z]+-500/10 to-[a-z]+-500/10 border border-[a-z]+-400/30 rounded-xl p-8( mb-8)?', 'fs-highlight-box'
        
        # Actualizar botones secundarios
        $content = $content -replace 'bg-[a-z]+-500 hover:bg-[a-z]+-400 text-white px-6 py-3 rounded-lg font-bold transition-colors', 'fs-btn fs-btn-secondary'
        
        # Actualizar scripts
        $content = $content -replace '<script src="../../assets/js/components\.js"></script>', '<script src="../../assets/js/formacion-semilla.js"></script>
  <script src="../../assets/js/components.js"></script>'
        
        # Escribir archivo actualizado
        Set-Content $filePath $content -Encoding UTF8
        Write-Host "✅ Completado: $taller"
    } else {
        Write-Host "❌ No encontrado: $filePath"
    }
}

Write-Host "`n🎉 Centralización completada para todos los talleres!"