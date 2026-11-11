export interface LessonYouTubeHandle { seekTo(seconds: number): void; }
export interface LessonYouTubeProps {
  videoId: string;
  height: number;
  playing: boolean;
  muted: boolean;
  playbackRate: number;
  startTime: number;
  onReady(): void;
  onRates(rates: number[]): void;
  onRateChange(rate: number): void;
  onPlaying(playing: boolean): void;
  onProgress(time: number, duration: number): void;
  onError(): void;
}
