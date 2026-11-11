export interface LessonYouTubeHandle { seekTo(seconds: number): void; }
export interface LessonYouTubeProps {
  videoId: string;
  height: number;
  playing: boolean;
  muted: boolean;
  startTime: number;
  onReady(): void;
  onPlaying(playing: boolean): void;
  onProgress(time: number, duration: number): void;
  onError(): void;
}
