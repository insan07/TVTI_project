export type AssignedCourseBatch = {
  _id?: string;
  name?: string;
  course_id?: { _id?: string; title?: string; code?: string } | string | null;
};

export type EnrolledCourseSummary = {
  id: string;
  title: string;
  code?: string;
  batchNames: string[];
};

/** A course can have multiple enrolled batches; show it once with its batch names. */
export function getEnrolledCourses(batches: AssignedCourseBatch[]): EnrolledCourseSummary[] {
  const courses = new Map<string, EnrolledCourseSummary>();

  for (const batch of batches) {
    const course = batch?.course_id;
    if (!course || typeof course !== 'object' || !course.title?.trim()) continue;
    const title = course.title.trim();
    const code = course.code?.trim() || undefined;
    const id = course._id || code || title.toLowerCase();
    let summary = courses.get(id);
    if (!summary) {
      summary = { id, title, code, batchNames: [] };
      courses.set(id, summary);
    }
    const batchName = batch.name?.trim();
    if (batchName && !summary.batchNames.includes(batchName)) summary.batchNames.push(batchName);
  }

  return [...courses.values()];
}
