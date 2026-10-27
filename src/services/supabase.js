import { createClient } from '@supabase/supabase-js';

// As credenciais vêm de variáveis de ambiente (arquivo .env, NUNCA commitado).
// Veja o arquivo .env.example para saber quais variáveis criar.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Nome do bucket criado no painel do Supabase (Storage)
export const SUPABASE_BUCKET =
  import.meta.env.VITE_SUPABASE_BUCKET || 'fotos-camera';

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
