import api from './api';
import { storage } from '../utils/storage';

const migrations = new Map<string, Promise<void>>();

/** Move existing device pins to the student's account without dropping them. */
export function migrateLegacyLessonPins(studentId?: string): Promise<void> {
  if (!studentId) return Promise.resolve();
  const running = migrations.get(studentId);
  if (running) return running;
  const migration = migrate(studentId).finally(() => migrations.delete(studentId));
  migrations.set(studentId, migration);
  return migration;
}

async function migrate(studentId: string) {
  const migratedKey = `lesson_pins_migrated_${studentId}`;
  if (await storage.getItem(migratedKey)) return;
  const saved = await storage.getItem(`pinned_lessons_${studentId}`);
  let pins: Record<string, unknown> = {};
  try {
    const parsed = saved ? JSON.parse(saved) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) pins = parsed;
  } catch {}
  const ids = Object.keys(pins).filter(id => pins[id] === true && /^[a-f\d]{24}$/i.test(id)).slice(0, 3);
  for (const id of ids) {
    try {
      await api.patch(`/students/videos/${id}/pin`, { pinned: true });
    } catch (error: any) {
      const status = error.response?.status;
      const unavailable = status === 404 && error.response?.data?.message === 'Video not found';
      if (status !== 400 && status !== 403 && status !== 409 && !unavailable) throw error;
    }
  }
  await storage.setItem(migratedKey, 'true');
}
