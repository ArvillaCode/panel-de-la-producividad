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
    .select('id, title, description, thumbnail_url, category, is_premium, is_published, slug, created_at')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.or('is_published.is.true,is_published.is.null');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchModulesAndLessons(courseId: string, _isAdmin: boolean): Promise<any[]> {
  // 1. Obtener módulos
  const { data: modulesData, error: modulesError } = await supabase
    .from('academy_modules')
    .select('id, title, order_index, created_at')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (modulesError) throw modulesError;

  const moduleIds = (modulesData || []).map((module: any) => module.id);

  // Una sola consulta cubre lecciones con modulo y lecciones huerfanas.
  let lessonsQuery = supabase
    .from('academy_lessons')
    .select('id, title, description, video_path, order_index, materiales, is_visible, thumbnail_url, module_id, course_id, youtube_id, youtube_title, youtube_duration_seconds, youtube_thumbnail_url, require_completion, minimum_watch_percent')
    .order('order_index', { ascending: true });

  lessonsQuery = moduleIds.length > 0
    ? lessonsQuery.or(`course_id.eq.${courseId},module_id.in.(${moduleIds.join(',')})`)
    : lessonsQuery.eq('course_id', courseId);

  const { data: lessonsData, error: lessonsError } = await lessonsQuery;

  if (lessonsError) throw lessonsError;
  return [modulesData || [], lessonsData || []];
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
    youtube_id?: string | null;
    youtube_title?: string | null;
    youtube_duration_seconds?: number | null;
    youtube_thumbnail_url?: string | null;
    require_completion?: boolean;
    minimum_watch_percent?: number;
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
