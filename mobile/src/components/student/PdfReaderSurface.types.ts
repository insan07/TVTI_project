export interface PdfReaderSurfaceProps {
  html: string;
  page: number;
  zoom: number;
  command: number;
  onMessage(message: { type: string; page?: number; pages?: number; message?: string }): void;
}
