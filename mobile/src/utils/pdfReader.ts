export function resolvePdfUrl(raw: string, apiUrl: string): string {
  const value = raw.trim();
  if (!value) throw new Error('No document was attached to this lesson.');
  const url = new URL(value, apiUrl.replace(/\/api\/?$/, '') + '/');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('This document link is unsupported.');
  return url.href;
}

export function pdfBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let chunk = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const bits = (bytes[index] << 16) | ((bytes[index + 1] || 0) << 8) | (bytes[index + 2] || 0);
    chunk += alphabet[(bits >>> 18) & 63] + alphabet[(bits >>> 12) & 63]
      + (index + 1 < bytes.length ? alphabet[(bits >>> 6) & 63] : '=')
      + (index + 2 < bytes.length ? alphabet[bits & 63] : '=');
    if (chunk.length >= 16384) { chunks.push(chunk); chunk = ''; }
  }
  chunks.push(chunk);
  return chunks.join('');
}

export function isPdfFile(bytes: Uint8Array): boolean {
  return Array.from(bytes.subarray(0, 1024), byte => String.fromCharCode(byte)).join('').includes('%PDF-');
}

export function pdfFileName(title: string): string {
  const name = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.pdf$/i, '').slice(0, 100);
  return `${name || 'Lesson notes'}.pdf`;
}
