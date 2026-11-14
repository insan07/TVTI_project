import React, { useEffect, useRef } from 'react';
import { PdfReaderSurfaceProps } from './PdfReaderSurface.types';

export default function PdfReaderSurface({ html, page, zoom, command, onMessage }: PdfReaderSurfaceProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const callback = useRef(onMessage);
  callback.current = onMessage;
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.source !== 'tvti-pdf') return;
      callback.current(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'tvti-pdf-command', page, zoom }, '*');
  }, [command]);
  return React.createElement('iframe', { ref: frame, srcDoc: html, title: 'Lesson notes reader', sandbox: 'allow-scripts',
    style: { width: '100%', height: '100%', border: 0, display: 'block' },
    onContextMenu: (event: React.MouseEvent) => event.preventDefault() });
}
