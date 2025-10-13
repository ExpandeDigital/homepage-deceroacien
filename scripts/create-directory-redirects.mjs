#!/usr/bin/env node
import { readdir, writeFile, stat } from 'fs/promises';
import path from 'path';

const distDir = './dist';

async function createDirectoryRedirects() {
  const entries = await readdir(distDir);
  
  for (const entry of entries) {
    const entryPath = path.join(distDir, entry);
    const entryStat = await stat(entryPath);
    
    // Si es un directorio
    if (entryStat.isDirectory()) {
      const indexPath = path.join(entryPath, 'index.html');
      
      try {
        await stat(indexPath);
        // Si existe index.html en el directorio, crear archivo de redirección
        const redirectContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Redirecting...</title>
    <script>
        // Auto-redirect to index.html in directory
        window.location.replace('./${entry}/index.html');
    </script>
    <meta http-equiv="refresh" content="0; url=./${entry}/index.html">
</head>
<body>
    <p>Si no eres redirigido automáticamente, <a href="./${entry}/index.html">haz clic aquí</a>.</p>
</body>
</html>`;
        
        const redirectFile = path.join(distDir, `${entry}.html`);
        await writeFile(redirectFile, redirectContent, 'utf8');
        console.log(`✅ Creado redirect: ${entry}.html → ${entry}/index.html`);
        
      } catch (err) {
        // No existe index.html, no hacer nada
      }
    }
  }
}

createDirectoryRedirects()
  .then(() => console.log('✅ Redirects de directorio completados'))
  .catch(console.error);