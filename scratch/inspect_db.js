import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: courses, error: err1 } = await supabase
    .from('academy_courses')
    .select('*')
    .eq('id', '1554');
    
  console.log("COURSE 1554:", courses);

  const { data: lessons, error: err2 } = await supabase
    .from('academy_lessons')
    .select('*')
    .eq('course_id', '1554');

  console.log("LESSONS FOR 1554:", lessons);
}

inspect();
