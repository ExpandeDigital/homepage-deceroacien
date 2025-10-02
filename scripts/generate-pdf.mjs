import fs from 'fs/promises';
import path from 'path';

async function ensurePuppeteer() {
  try {
    return await import('puppeteer');
  } catch {
    console.error('\nFalta puppeteer. Instálalo con: npm i -D puppeteer\n');
    process.exit(1);
  }
}

async function toPdf(inputHtmlPath, outputPdfPath) {
  const { default: puppeteer } = await ensurePuppeteer();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const abs = path.resolve(inputHtmlPath);
    const url = `file://${abs.replace(/\\/g,'/')}`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    // Inyectar marca de agua y leyenda "Uso interno — fecha" en portada
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const wmText = `USO INTERNO — ${dateStr}`;
    await page.addStyleTag({ content: `
      @media print {
        ._wm_internal_ { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 72px; color: rgba(0,0,0,0.08); z-index: 99999; white-space: nowrap; pointer-events: none; font-weight: 700; }
      }
      @page { margin: 14mm 12mm; }
    `});
    await page.evaluate((txt) => {
      // Marca de agua global
      const wm = document.createElement('div');
      wm.className = '_wm_internal_';
      wm.textContent = txt;
      document.body.appendChild(wm);
      // Leyenda en portada (si existe .cover)
      const cover = document.querySelector('.cover');
      if (cover) {
        const p = document.createElement('p');
        p.textContent = `Uso interno — ${txt.split('—')[1].trim()}`;
        p.style.marginTop = '6px';
        p.style.color = '#94a3b8';
        p.style.fontSize = '14px';
        cover.appendChild(p);
      }
    }, wmText);
    await page.pdf({ path: outputPdfPath, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
    console.log('PDF generado:', outputPdfPath);
  } finally {
    await browser.close();
  }
}

async function main() {
  const root = process.cwd();
  const outDir = path.join(root, 'reports', 'pdf');
  try { await fs.mkdir(outDir, { recursive: true }); } catch {}
  await toPdf(path.join(root, 'reports', 'informe-tecnico.html'), path.join(outDir, 'informe-tecnico.pdf'));
  await toPdf(path.join(root, 'reports', 'informe-no-tecnico.html'), path.join(outDir, 'informe-no-tecnico.pdf'));
}

main().catch(err => { console.error(err); process.exit(1); });
