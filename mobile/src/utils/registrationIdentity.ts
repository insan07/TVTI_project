type Identity = { registration_number?: string; index_number?: string; generated_index_number?: string; name?: string; _id?: string };

/** The official registration number is the public identity; old indexes remain login aliases. */
export function registrationNumberOf(user?: Identity | null): string {
  return user?.registration_number?.trim() || user?.index_number?.trim() || user?.generated_index_number?.trim() || '';
}

export function compareRegistrationNumbers(a: Identity, b: Identity): number {
  const left = registrationNumberOf(a), right = registrationNumberOf(b);
  if (!left || !right) return left ? -1 : right ? 1 : (a.name || '').localeCompare(b.name || '');
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' }) || (a.name || '').localeCompare(b.name || '') || String(a._id || '').localeCompare(String(b._id || ''));
}
