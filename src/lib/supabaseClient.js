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
 * Custom Fetch con Timeout estricto de 3 segundos.
 * Evita el "agujero negro" de 2 minutos cuando el Service Worker 
 * o una red inestable (Lie-Fi) secuestran la petición.
 */
const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3000); // Corta la petición a los 3 segundos
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error; // Falla rápido para que la app sepa que está offline
  }
};

/**
 * Cliente Supabase singleton — configurado para PWA Offline-First
 *
 * persistSession: true     -> Guarda el Refresh Token en localStorage
 * autoRefreshToken: true    -> Renueva silenciosamente el JWT cuando hay internet
 * detectSessionInUrl: false -> No necesario para login con email/password
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout, // Inyectamos nuestro candado de 3 segundos
  }
});