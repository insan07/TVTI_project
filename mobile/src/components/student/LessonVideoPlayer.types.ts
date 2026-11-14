export interface LessonVideoHandle {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  setMuted(muted: boolean): void;
}
export interface LessonVideoProps {
  url: string;
  startTime: number;
  muted: boolean;
  playbackRate: number;
  onReady(): void;
  onPlaying(playing: boolean): void;
  onProgress(time: number, duration: number): void;
  onError(): void;
  onRestrictedAction(reason: string): void;
}
