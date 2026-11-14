import React, { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { PdfReaderSurfaceProps } from './PdfReaderSurface.types';

export default function PdfReaderSurface({ html, page, zoom, command, onMessage }: PdfReaderSurfaceProps) {
  const webview = useRef<WebView>(null);
  useEffect(() => {
    webview.current?.injectJavaScript(`window.TVTIReader?.showPage(${page}, ${zoom}); true;`);
  }, [command]);
  return <WebView ref={webview} source={{ html }} style={{ flex: 1, backgroundColor: 'transparent' }}
    originWhitelist={['*']} onShouldStartLoadWithRequest={request => ['about:blank', 'about:srcdoc'].includes(request.url)}
    javaScriptEnabled domStorageEnabled={false} allowsLinkPreview={false} setSupportMultipleWindows={false}
    javaScriptCanOpenWindowsAutomatically={false} onOpenWindow={() => {}} onFileDownload={() => {}}
    onMessage={event => { try { onMessage(JSON.parse(event.nativeEvent.data)); } catch { /* Ignore unrelated events. */ } }}
    onError={() => onMessage({ type: 'error', message: 'The document reader could not start. Please try again.' })} />;
}
