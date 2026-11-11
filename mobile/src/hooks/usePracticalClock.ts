import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { practicalInstant } from '../utils/practicalTime';

// Re-render at session boundaries so statuses don't require leaving the page.
export default function usePracticalClock(slots: any[]) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const boundaries = slots.flatMap(slot => [practicalInstant(slot, 'start'), practicalInstant(slot, 'end'),
      Date.parse(slot.booking_closes_at || slot.booking_deadline)]).filter(time => Number.isFinite(time) && time > now);
    const delay = Math.max(100, Math.min(60_000, ...boundaries.map(time => time - Date.now() + 20)));
    const timer = setTimeout(() => setNow(Date.now()), delay);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [slots, now]);
  return now;
}
