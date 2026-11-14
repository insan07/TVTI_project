// Bundles Mozilla PDF.js into a local reader: no Google viewer or CDN at runtime.
const { buildSync } = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const bundle = (entry, name) => buildSync({
  entryPoints: [path.join(root, 'node_modules/pdfjs-dist/legacy/build', entry)],
  bundle: true, write: false, minify: true, format: 'iife', globalName: name,
  platform: 'browser', target: 'es2020', external: ['node:*', '@napi-rs/canvas'],
  legalComments: 'inline', logLevel: 'error',
}).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync(path.join(__dirname, 'pdf-reader-shell.html'), 'utf8')
  .replace('/*__PDF_LIBRARY__*/', () => bundle('pdf.min.mjs', 'pdfjsLib'))
  .replace('/*__PDF_WORKER__*/', () => bundle('pdf.worker.min.mjs', 'pdfjsWorker'));
fs.writeFileSync(path.join(root, 'assets/pdf-reader.html'), html);
fs.copyFileSync(path.join(root, 'node_modules/pdfjs-dist/LICENSE'), path.join(root, 'assets/PDFJS_LICENSE.txt'));
console.log('Built bundled PDF reader:', Buffer.byteLength(html), 'bytes');
