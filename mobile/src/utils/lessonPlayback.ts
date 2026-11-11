export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = parsed.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = parsed.searchParams.get('v') || (/^\/(embed|shorts|live|v)\//.test(parsed.pathname) ? parsed.pathname.split('/')[2] : null);
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

// Only the player document and embedded player may navigate in the native WebView.
// In particular, do not use the library's default iOS handler that opens YouTube.
export function allowLessonPlayerNavigation(url: string): boolean {
  if (url === 'about:blank' || url === 'about:srcdoc') return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname === 'lonelycpp.github.io') return parsed.pathname === '/react-native-youtube-iframe/iframe.html';
    return ['www.youtube.com', 'www.youtube-nocookie.com'].includes(parsed.hostname) && parsed.pathname.startsWith('/embed/');
  } catch { return false; }
}

export function playbackTime(seconds: number): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, '0')}`;
}
