const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

(async () => {
  try {
    const baseDir = path.resolve(__dirname, '..');
    const mdPath = path.join(baseDir, 'PRESENTACAO.md');
    const outFile = path.join(baseDir, 'Apresentacao_NauticaPrime.pptx');

    // collect whatsapp images and code screenshots
    const whatsappImages = fs.existsSync(baseDir)
      ? fs.readdirSync(baseDir).filter(f => /^whatsapp_.*\.png$/i.test(f)).map(f => path.join(baseDir, f))
      : [];

    const codeScreensDir = path.join(baseDir, 'code_screens');
    const codeScreens = fs.existsSync(codeScreensDir)
      ? fs.readdirSync(codeScreensDir).filter(f => /\.png$/i.test(f)).map(f => path.join(codeScreensDir, f))
      : [];

    if (!fs.existsSync(mdPath)) {
      console.error('PRESENTACAO.md not found at', mdPath);
      process.exit(1);
    }

    const md = fs.readFileSync(mdPath, 'utf8');
    // split slides by '---' divider
  const parts = md.split(/\n---\n/gi).map(p => p.trim()).filter(Boolean);

    const pptx = new PptxGenJS();

    for (let i = 0; i < parts.length; i++) {
      const chunk = parts[i];
      // find first markdown header as title
      const lines = chunk.split(/\r?\n/).map(l => l.trim());
      let title = '';
      let bodyLines = [];

      for (const l of lines) {
        if (!title && /^##+\s+/.test(l)) {
          title = l.replace(/^##+\s+/, '');
        } else if (!title && /^#\s+/.test(l)) {
          title = l.replace(/^#\s+/, '');
        } else {
          bodyLines.push(l);
        }
      }

      if (!title) title = `Slide ${i+1}`;
      const slide = pptx.addSlide();
      slide.addText(title, { x: 0.5, y: 0.3, fontSize: 24, bold: true, color: '363636' });

      // Assemble body text, limit length per slide
      const body = bodyLines.join('\n');
      // Split body into chunks to fit
      const maxChars = 8000; // generous
      slide.addText(body, { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 14, color: '333333', wrap: true });

    }

    // After generating slides from markdown, append evidence slides (WhatsApp screenshots)
    if (whatsappImages.length) {
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Evidências - WhatsApp', { x: 0.5, y: 0.3, fontSize: 26, bold: true });

      for (const img of whatsappImages) {
        try {
          const slide = pptx.addSlide();
          const fileName = path.basename(img);
          slide.addText(fileName, { x: 0.5, y: 0.2, fontSize: 14, color: '666666' });
          slide.addImage({ path: img, x: 0.6, y: 0.8, w: 9, h: 5 });
          // caption / explanation derived from filename
          const caption = `Print: ${fileName} — mostra o estado da conversa/fluxo WhatsApp (envio/typing/after-send). Arquivo relacionado: send_whatsapp_puppeteer.js ou scripts de captura.`;
          slide.addText(caption, { x: 0.5, y: 6.0, w: 9, h: 0.6, fontSize: 12, color: '444444', wrap: true });
        } catch (err) {
          console.warn('Erro incluindo imagem', img, err.message || err);
        }
      }
    }

    // Append code screenshots with short explanations
    if (codeScreens.length) {
      const titleSlide2 = pptx.addSlide();
      titleSlide2.addText('Evidências - Código (trechos relevantes)', { x: 0.5, y: 0.3, fontSize: 24, bold: true });

      for (const img of codeScreens) {
        try {
          const slide = pptx.addSlide();
          const fileName = path.basename(img);
          const nameOnly = fileName.replace(/\.png$/i, '');
          // friendly caption from filename
          const caption = `${nameOnly} — trecho de código relevante. Use este print para mostrar onde a integração ou fallback foi implementado.`;
          slide.addText(nameOnly, { x: 0.5, y: 0.2, fontSize: 14, color: '666666' });
          slide.addImage({ path: img, x: 0.6, y: 0.8, w: 9, h: 5 });
          slide.addText(caption, { x: 0.5, y: 6.0, w: 9, h: 0.6, fontSize: 12, color: '444444', wrap: true });
        } catch (err) {
          console.warn('Erro incluindo code screen', img, err.message || err);
        }
      }
    }
    
  await pptx.writeFile({ fileName: outFile });
    console.log('PPTX criado em:', outFile);
  } catch (err) {
    console.error('Erro gerando PPTX:', err);
    process.exit(1);
  }
})();
