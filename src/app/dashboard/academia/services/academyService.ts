import { supabase } from '../../../../lib/supabase.js';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  category: string;
  is_premium: boolean;
  is_published?: boolean;
  slug?: string;
  created_at?: string;
}

export interface Module {
  id: string;
  title: string;
  course_id?: string;
  order_index?: number;
  lessons: any[];
}

export async function fetchCourses(isAdmin: boolean): Promise<Course[]> {
  let query = supabase
    .from('academy_courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.or('is_published.is.true,is_published.is.null');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchModulesAndLessons(courseId: string, isAdmin: boolean): Promise<any[]> {
  // 1. Obtener módulos
  const { data: modulesData, error: modulesError } = await supabase
    .from('academy_modules')
    .select('id, title, order_index, created_at')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (modulesError) throw modulesError;

  const moduleIds = (modulesData || []).map((mod: any) => mod.id);
  const lessonsById = new Map<string, any>();

  // 2. Obtener lecciones asociadas a módulos
  if (moduleIds.length > 0) {
    const { data: lessonsByModule, error: lessonsByModuleError } = await supabase
      .from('academy_lessons')
      .select('id, title, description, video_path, order_index, materiales, is_visible, thumbnail_url, module_id, course_id')
      .in('module_id', moduleIds)
      .order('order_index', { ascending: true });

    if (lessonsByModuleError) throw lessonsByModuleError;
    (lessonsByModule || []).forEach((lesson: any) => lessonsById.set(String(lesson.id), lesson));
  }

  // 3. Obtener lecciones asociadas directamente al curso (lecciones huérfanas)
  const { data: lessonsByCourse, error: lessonsByCourseError } = await supabase
    .from('academy_lessons')
    .select('id, title, description, video_path, order_index, materiales, is_visible, thumbnail_url, module_id, course_id')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (lessonsByCourseError) throw lessonsByCourseError;
  (lessonsByCourse || []).forEach((lesson: any) => lessonsById.set(String(lesson.id), lesson));

  const allLessons = Array.from(lessonsById.values());
  return [modulesData || [], allLessons];
}

export async function saveGlobalAcademySettings(
  title: string,
  description: string,
  logo: string,
  existingSettingsCourse: Course | undefined
): Promise<Course> {
  const slug = 'global-academy-settings';

  if (existingSettingsCourse) {
    const { data, error } = await supabase
      .from('academy_courses')
      .update({ title, description, thumbnail_url: logo })
      .eq('id', existingSettingsCourse.id)
      .select();

    if (error) throw error;
    return data[0];
  } else {
    const { data, error } = await supabase
      .from('academy_courses')
      .insert([{ title, description, thumbnail_url: logo, slug, category: 'System', is_published: false }])
      .select();

    if (error) throw error;
    return data[0];
  }
}

export async function saveCourse(
  courseForm: any,
  editingCourseId: string | null
): Promise<Course> {
  const slug = courseForm.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (editingCourseId) {
    const { data, error } = await supabase
      .from('academy_courses')
      .update({ ...courseForm, slug })
      .eq('id', editingCourseId)
      .select();

    if (error) throw error;
    return data[0];
  } else {
    const { data, error } = await supabase
      .from('academy_courses')
      .insert([{ ...courseForm, slug }])
      .select();

    if (error) throw error;
    return data[0];
  }
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('academy_courses').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from('academy_lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase.from('academy_modules').delete().eq('id', id);
  if (error) throw error;
}

export async function updateLesson(
  id: string,
  payload: {
    title: string;
    description: string;
    video_path: string;
    thumbnail_url: string;
    materiales: any[];
  }
): Promise<void> {
  const { error } = await supabase
    .from('academy_lessons')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

export async function updateModulesOrder(modules: any[]): Promise<void> {
  const promises = modules.map((m) =>
    supabase
      .from('academy_modules')
      .update({ order_index: m.order_index })
      .eq('id', m.id)
  );
  await Promise.all(promises);
}

export async function updateLessonsOrder(lessons: any[]): Promise<void> {
  const promises = lessons.map((l) =>
    supabase
      .from('academy_lessons')
      .update({ order_index: l.order_index })
      .eq('id', l.id)
  );
  await Promise.all(promises);
}
