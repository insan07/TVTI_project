export type UploadItem = {
  _id: string;
  title: string;
  topic?: string;
  content_type?: 'video' | 'material';
  cloudinary_url?: string;
  youtube_url?: string;
  thumbnail?: string;
  notes_url?: string;
  duration?: string;
  createdAt?: string;
  uploaded_at?: string;
};

export type UploadModule = { key: string; title: string; videos: UploadItem[]; materials: UploadItem[] };

export function groupUploadModules(videos: UploadItem[], materials: UploadItem[]): UploadModule[] {
  const modules = new Map<string, UploadModule>();
  const add = (item: UploadItem, kind: 'videos' | 'materials') => {
    const title = item.topic?.trim() || 'General';
    const key = title.toLowerCase();
    if (!modules.has(key)) modules.set(key, { key, title, videos: [], materials: [] });
    modules.get(key)![kind].push(item);
  };
  videos.forEach(item => add(item, 'videos'));
  materials.forEach(item => add(item, 'materials'));
  return [...modules.values()];
}

export function getUploadThumbnail(item: UploadItem): string | undefined {
  if (item.thumbnail) return item.thumbnail;
  const url = item.youtube_url || item.cloudinary_url || '';
  if (url.includes('youtu')) {
    const id = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed|shorts)\/|[?&]v=)([\w-]{11})/)?.[1];
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
  }
  if (url.includes('cloudinary.com') && /\.[^/.?#]+(?:[?#].*)?$/.test(url)) {
    return url.replace(/\.[^/.?#]+([?#].*)?$/, '.jpg$1');
  }
  return undefined;
}

export function uploadDocumentUrl(url: string, apiUrl: string): string {
  return url.startsWith('/uploads/') || url.startsWith('/api/files/')
    ? `${apiUrl.replace(/\/api\/?$/, '')}${url}`
    : url;
}

export function formatUploadDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
