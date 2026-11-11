export type NotificationEntry = {
  _id: string; title: string; message: string; type?: string; is_read: boolean; createdAt?: string;
  link?: string; related_id?: string;
};
export type NotificationDateSection = { key: string; title: string; data: NotificationEntry[] };
const OFFSET = 330 * 60_000;
const dateKey = (time: number) => new Date(time + OFFSET).toISOString().slice(0, 10);
const timestamp = (value?: string) => value ? Date.parse(value) : NaN;

export function groupNotificationsByDate(items: NotificationEntry[], now = Date.now()): NotificationDateSection[] {
  const today = dateKey(now), yesterday = dateKey(now - 86_400_000);
  const sorted = [...items].sort((a, b) => {
    const first = timestamp(a.createdAt), second = timestamp(b.createdAt);
    return (Number.isFinite(second) ? second : -Infinity) - (Number.isFinite(first) ? first : -Infinity) || 0;
  });
  const sections = new Map<string, NotificationDateSection>();
  sorted.forEach(item => {
    const time = timestamp(item.createdAt);
    const key = Number.isFinite(time) ? dateKey(time) : 'earlier';
    if (!sections.has(key)) {
      const title = key === today ? 'Today' : key === yesterday ? 'Yesterday' : key === 'earlier' ? 'Earlier'
        : new Date(time).toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      sections.set(key, { key, title, data: [] });
    }
    sections.get(key)!.data.push(item);
  });
  return [...sections.values()];
}

export function notificationClockTime(value?: string): string {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function millisecondsUntilNotificationDayChange(now = Date.now()): number {
  return 86_400_000 - (now + OFFSET) % 86_400_000 + 50;
}
