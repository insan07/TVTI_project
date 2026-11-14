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

/** Student requests always stay within enrolled batches; a failure rejects the whole view. */
export async function loadBatchUploads(batches: any[], selectedBatchId: string | null, instructor: boolean,
  kind: 'videos' | 'materials', get: (path: string) => Promise<{ data: any[] }>): Promise<any[]> {
  const chosen = selectedBatchId ? batches.filter(batch => batch._id === selectedBatchId) : batches;
  if (chosen.length === 0) return [];
  if (instructor) {
    const response = await get(`/instructors/${kind}`);
    return (response.data || []).filter(item => chosen.some(batch => String(item.batch_id?._id || item.batch_id) === batch._id));
  }
  const results = await Promise.all(chosen.map(async batch => {
    const response = await get(`/students/batches/${batch._id}/${kind}`);
    return (response.data || []).map(item => ({ ...item, batch_id: batch }));
  }));
  return results.flat();
}

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
