import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Terra Form] Faltan las variables de entorno de Supabase. ' +
    'Asegúrate de que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén en tu archivo .env'
  );
}

/**
 * Cliente Supabase singleton — configurado para PWA Offline-First
 *
 * persistSession: true      → Guarda el Refresh Token en localStorage
 *                              para que el ganadero no vuelva a loguearse nunca
 * autoRefreshToken: true     → Renueva silenciosamente el JWT cuando hay internet
 * detectSessionInUrl: false  → No necesario para login con email/password
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
