# Script para detectar y corregir problemas de codificación en archivos HTML
# Especializado en caracteres españoles mal codificados

param(
    [string[]]$Folders = @(".", "fase_1_ecd", "fase_2_ecd", "fase_3_ecd", "fase_4_ecd", "fase_5_ecd", "conecta", "gamificacion"),
    [switch]$Verbose = $false,
    [switch]$FixEncoding = $true,
    [switch]$AllProject = $false
)

Write-Host "=== Detección y corrección de problemas de codificación ===" -ForegroundColor Cyan

if ($AllProject) {
    Write-Host "Modo: TODO EL PROYECTO" -ForegroundColor Yellow
    $Folders = @(".", "fase_1_ecd", "fase_2_ecd", "fase_3_ecd", "fase_4_ecd", "fase_5_ecd", "conecta", "gamificacion")
} else {
    Write-Host "Carpetas a procesar: $($Folders -join ', ')" -ForegroundColor Yellow
}

$rootPath = Split-Path $PSScriptRoot -Parent
$totalFiles = 0
$fixedFiles = 0
$errorFiles = @()

function Fix-EncodingIssues {
    param(
        [string]$FilePath,
        [string]$Content
    )
    
    $originalContent = $Content
    $fixedContent = $Content
    $fixesApplied = @()
    
    # Lista de reemplazos comunes para caracteres mal codificados
    $replacements = @(
        @{ From = '√°'; To = 'á' },
        @{ From = '√©'; To = 'é' },
        @{ From = '√≠'; To = 'í' },
        @{ From = '√≥'; To = 'ó' },
        @{ From = '√∫'; To = 'ú' },
        @{ From = '√±'; To = 'ñ' },
        @{ From = '√º'; To = 'ü' },
        @{ From = '¬ø'; To = '¿' },
        @{ From = '¬°'; To = '¡' },
        @{ From = '√Å'; To = 'Á' },
        @{ From = '√É'; To = 'É' },
        @{ From = '√Í'; To = 'Í' },
        @{ From = '√Ó'; To = 'Ó' },
        @{ From = '√Ú'; To = 'Ú' },
        @{ From = '√Ñ'; To = 'Ñ' },
        @{ From = '√Ü'; To = 'Ü' }
    )
    
    foreach ($replacement in $replacements) {
        if ($fixedContent.Contains($replacement.From)) {
            $fixedContent = $fixedContent.Replace($replacement.From, $replacement.To)
            $fixesApplied += "$($replacement.From) → $($replacement.To)"
        }
    }
    
    if ($fixedContent -ne $originalContent) {
        if ($Verbose) {
            Write-Host "    🔧 Correcciones aplicadas:" -ForegroundColor Yellow
            foreach ($fix in $fixesApplied) {
                Write-Host "      - $fix" -ForegroundColor Gray
            }
        }
        
        # Guardar el archivo corregido
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($FilePath, $fixedContent, $utf8NoBom)
        
        return $true
    }
    
    return $false
}

function Test-HasEncodingIssues {
    param([string]$Content)
    
    $problemPatterns = @('√°', '√©', '√≠', '√≥', '√∫', '√±', '√º', '¬ø', '¬°')
    
    foreach ($pattern in $problemPatterns) {
        if ($Content.Contains($pattern)) {
            return $true
        }
    }
    return $false
}

function Analyze-File {
    param([string]$FilePath)
    
    try {
        # Leer el archivo con diferentes codificaciones para encontrar la mejor
        $content = ""
        
        try {
            # Primero intentar UTF-8
            $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
        }
        catch {
            try {
                # Luego intentar Windows-1252
                $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::GetEncoding("Windows-1252"))
            }
            catch {
                # Finalmente, usar la codificación por defecto
                $content = Get-Content -Path $FilePath -Raw -Encoding Default
            }
        }
        
        return @{
            Content = $content
            HasIssues = (Test-HasEncodingIssues -Content $content)
        }
    }
    catch {
        Write-Warning "Error analizando $FilePath`: $($_.Exception.Message)"
        return $null
    }
}

foreach ($folder in $Folders) {
    if ($folder -eq ".") {
        $folderPath = $rootPath
        $folderName = "Raíz del proyecto"
    } else {
        $folderPath = Join-Path $rootPath $folder
        $folderName = $folder
    }
    
    if (-not (Test-Path $folderPath)) {
        Write-Warning "Carpeta no encontrada: $folderPath"
        continue
    }
    
    Write-Host "`n--- Procesando carpeta: $folderName ---" -ForegroundColor Magenta
    
    # Para la raíz, solo archivos HTML directos (no recursivo)
    if ($folder -eq ".") {
        $htmlFiles = Get-ChildItem -Path $folderPath -Filter "*.html" | Where-Object { -not $_.PSIsContainer }
    } else {
        $htmlFiles = Get-ChildItem -Path $folderPath -Filter "*.html" -Recurse
    }
    
    if ($htmlFiles.Count -eq 0) {
        Write-Host "  No se encontraron archivos HTML" -ForegroundColor Yellow
        continue
    }

    foreach ($file in $htmlFiles) {
        $totalFiles++
        $relativePath = $file.FullName.Replace($rootPath, "").TrimStart('\')
        
        Write-Host "  Analizando: $relativePath" -ForegroundColor White
        
        $analysis = Analyze-File -FilePath $file.FullName
        
        if ($analysis -eq $null) {
            Write-Host "    ❌ Error en el análisis" -ForegroundColor Red
            $errorFiles += $relativePath
            continue
        }
        
        if ($analysis.HasIssues) {
            Write-Host "    🔍 Problemas de codificación detectados" -ForegroundColor Yellow
            
            if ($FixEncoding) {
                $wasFixed = Fix-EncodingIssues -FilePath $file.FullName -Content $analysis.Content
                
                if ($wasFixed) {
                    Write-Host "    ✅ Archivo corregido exitosamente" -ForegroundColor Green
                    $fixedFiles++
                } else {
                    Write-Host "    ⚠️  No se pudieron aplicar correcciones" -ForegroundColor Yellow
                }
            } else {
                Write-Host "    ⏭️  Modo solo detección (usa -FixEncoding para corregir)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "    ✅ Codificación correcta" -ForegroundColor Green
        }
        
        # Mostrar muestra de caracteres españoles si está en modo verbose
        if ($Verbose) {
            $spanishMatches = [regex]::Matches($analysis.Content, '[áéíóúñüÁÉÍÓÚÑÜ¿¡]')
            if ($spanishMatches.Count -gt 0) {
                $sampleChars = ($spanishMatches | Select-Object -First 5 | ForEach-Object { $_.Value }) -join ', '
                Write-Host "    📝 Muestra de caracteres españoles: $sampleChars" -ForegroundColor Cyan
            }
        }
    }
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Total de archivos procesados: $totalFiles" -ForegroundColor White
Write-Host "Archivos corregidos: $fixedFiles" -ForegroundColor Green
Write-Host "Archivos con errores: $($errorFiles.Count)" -ForegroundColor Red

if ($errorFiles.Count -gt 0) {
    Write-Host "`nArchivos con errores:" -ForegroundColor Red
    $errorFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

if ($fixedFiles -gt 0) {
    Write-Host "`n💡 Archivos corregidos exitosamente" -ForegroundColor Yellow
    Write-Host "💡 Se recomienda revisar manualmente algunos archivos" -ForegroundColor Yellow
    Write-Host "💡 para verificar que todos los caracteres se muestran correctamente" -ForegroundColor Yellow
} elseif ($totalFiles -gt 0 -and $fixedFiles -eq 0) {
    Write-Host "`n✨ Todos los archivos ya tenían la codificación correcta" -ForegroundColor Green
}

Write-Host "`n✅ Proceso completado" -ForegroundColor Green

foreach ($folder in $Folders) {
    $folderPath = Join-Path $rootPath $folder
    
    if (-not (Test-Path $folderPath)) {
        Write-Warning "Carpeta no encontrada: $folderPath"
        continue
    }
    
    Write-Host "`n--- Procesando carpeta: $folder ---" -ForegroundColor Magenta
    
    $htmlFiles = Get-ChildItem -Path $folderPath -Filter "*.html" -Recurse
    
    if ($htmlFiles.Count -eq 0) {
        Write-Host "  No se encontraron archivos HTML" -ForegroundColor Yellow
        continue
    }
    
    foreach ($file in $htmlFiles) {
        $totalFiles++
        $relativePath = $file.FullName.Replace($rootPath, "").TrimStart('\')
        
        Write-Host "  Analizando: $relativePath" -ForegroundColor White
        
        $analysis = Analyze-File -FilePath $file.FullName
        
        if ($analysis -eq $null) {
            Write-Host "    ❌ Error en el análisis" -ForegroundColor Red
            $errorFiles += $relativePath
            continue
        }
        
        if ($analysis.HasIssues) {
            Write-Host "    🔍 Problemas de codificación detectados" -ForegroundColor Yellow
            Write-Host "    📝 Codificación detectada: $($analysis.Encoding)" -ForegroundColor Gray
            
            if ($FixEncoding) {
                $wasFixed = Fix-EncodingIssues -FilePath $file.FullName -Content $analysis.Content
                
                if ($wasFixed) {
                    Write-Host "    ✅ Archivo corregido exitosamente" -ForegroundColor Green
                    $fixedFiles++
                } else {
                    Write-Host "    ⚠️  No se pudieron aplicar correcciones" -ForegroundColor Yellow
                }
            } else {
                Write-Host "    ⏭️  Modo solo detección (usa -FixEncoding para corregir)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "    ✅ Codificación correcta" -ForegroundColor Green
        }
        
        # Mostrar muestra de caracteres españoles si está en modo verbose
        if ($Verbose) {
            $spanishMatches = [regex]::Matches($analysis.Content, '[áéíóúñüÁÉÍÓÚÑÜ¿¡]')
            if ($spanishMatches.Count -gt 0) {
                $sampleChars = ($spanishMatches | Select-Object -First 5 | ForEach-Object { $_.Value }) -join ', '
                Write-Host "    📝 Muestra de caracteres españoles: $sampleChars" -ForegroundColor Cyan
            }
        }
    }
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Total de archivos procesados: $totalFiles" -ForegroundColor White
Write-Host "Archivos corregidos: $fixedFiles" -ForegroundColor Green
Write-Host "Archivos con errores: $($errorFiles.Count)" -ForegroundColor Red

if ($errorFiles.Count -gt 0) {
    Write-Host "`nArchivos con errores:" -ForegroundColor Red
    $errorFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

if ($fixedFiles -gt 0) {
    Write-Host "`n💡 Archivos corregidos exitosamente" -ForegroundColor Yellow
    Write-Host "💡 Se recomienda revisar manualmente algunos archivos" -ForegroundColor Yellow
    Write-Host "💡 para verificar que todos los caracteres se muestran correctamente" -ForegroundColor Yellow
} elseif ($totalFiles -gt 0 -and $fixedFiles -eq 0) {
    Write-Host "`n✨ Todos los archivos ya tenían la codificación correcta" -ForegroundColor Green
}

Write-Host "`n✅ Proceso completado" -ForegroundColor Green