import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSchema() {
  console.log("--- INVESTIGACIÓN DE ESQUEMA ACADEMIA ---");
  
  // Intentar consultar academy_courses
  const { data, error } = await supabase.from('academy_courses').select('*').limit(1);
  
  if (error) {
    console.log("Error al consultar academy_courses:", error.message);
    console.log("Código de error:", error.code);
  } else {
    console.log("¡La tabla academy_courses EXISTE!");
    if (data.length > 0) {
      console.log("Columnas detectadas en la primera fila:", Object.keys(data[0]));
    } else {
      console.log("La tabla está vacía. No puedo deducir columnas por datos.");
    }
  }

  // Intentar consultar academy_lessons
  const { data: lessons, error: lessonsError } = await supabase.from('academy_lessons').select('*').limit(1);
  if (lessonsError) {
    console.log("\nError al consultar academy_lessons:", lessonsError.message);
  } else {
    console.log("\n¡La tabla academy_lessons EXISTE!");
    if (lessons.length > 0) {
      console.log("Columnas detectadas:", Object.keys(lessons[0]));
    }
  }
}

debugSchema();
