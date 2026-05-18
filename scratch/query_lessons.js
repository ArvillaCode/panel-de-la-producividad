import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://krtthtzljlyewlngaklo.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_aEHBN2kyCw_nLv06x3UYKg_9dLEVg1p';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('academy_lessons')
    .select('*');
  
  if (error) {
    console.error("Error querying lessons:", error);
    return;
  }
  
  console.log("\n--- ACADEMY LESSONS ---");
  data.forEach(lesson => {
    console.log(`ID: ${lesson.id}`);
    console.log(`Title: ${lesson.title}`);
    console.log(`Video Path: ${lesson.video_path}`);
    console.log(`Video URL: ${lesson.video_url}`);
    console.log(`Created At: ${lesson.created_at}`);
    console.log("------------------------");
  });
}

run();
