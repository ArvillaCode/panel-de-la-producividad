import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable requerida: ${name}`);
  }
  return value;
};

const supabase = createClient(
  required('VITE_SUPABASE_URL'),
  required('VITE_SUPABASE_ANON_KEY')
);

async function run() {
  const { data, error } = await supabase
    .from('academy_lessons')
    .select('id, title, video_path, video_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  console.log('\n--- ACADEMY LESSONS ---');
  for (const lesson of data || []) {
    console.log(`ID: ${lesson.id}`);
    console.log(`Title: ${lesson.title}`);
    console.log(`Video Path: ${lesson.video_path}`);
    console.log(`Video URL: ${lesson.video_url}`);
    console.log(`Created At: ${lesson.created_at}`);
    console.log('------------------------');
  }
}

run().catch((error) => {
  console.error('Error querying lessons:', error);
  process.exitCode = 1;
});
