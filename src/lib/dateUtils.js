import { differenceInMonths, differenceInYears, formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parsea una fecha string (YYYY-MM-DD) asegurando que se trate como el inicio del día local (00:00:00)
 * para evitar el problema de "fecha futura" si el animal nació hoy por la mañana.
 */
export function parseLocalDate(dateString) {
  if (!dateString) return null;
  // Si ya viene con T, asumimos que es ISO completo, si no, le agregamos el inicio del día local
  const isoString = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
  return new Date(isoString);
}

/**
 * Formatea una fecha string de forma legible en español (ej: "18 de abril de 2026").
 */
export function formatDateLocal(dateString) {
  if (!dateString) return '---';
  const date = parseLocalDate(dateString);
  if (isNaN(date)) return '---';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Formatea una fecha string de forma corta (ej: "18/04/2026").
 */
export function formatShortDateLocal(dateString) {
  if (!dateString) return '---';
  const date = parseLocalDate(dateString);
  if (isNaN(date)) return '---';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Calcula la edad de un animal de forma legible.
 * @param {string | Date} birthDate - Fecha de nacimiento.
 * @returns {string} - Edad formateada (ej: "2 años 3 meses", "1 mes", "15 días", "Hoy").
 */
export function calculateAge(birthDate) {
  if (!birthDate) return 'Desconocida';

  const birth = parseLocalDate(birthDate.toString());
  const now = new Date();
  
  // Normalizamos "now" al inicio del día para evitar falsos positivos de "fecha futura" en el mismo día
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  if (birth > todayStart) return 'Fecha futura';

  // --- NUEVA VALIDACIÓN: Si nació exactamente el día de hoy ---
  if (
    birth.getFullYear() === now.getFullYear() &&
    birth.getMonth() === now.getMonth() &&
    birth.getDate() === now.getDate()
  ) {
    return 'Hoy';
  }

  const years = differenceInYears(now, birth);
  const months = differenceInMonths(now, birth) % 12;

  if (years >= 1) {
    if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years} ${years === 1 ? 'año' : 'años'} ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  if (months >= 1) {
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  // Si tiene menos de un mes, usar días
  return formatDistanceToNowStrict(birth, { locale: es, addSuffix: false })
    .replace('días', 'días')
    .replace('día', 'día');
}

/**
 * Formatea un peso para mostrarlo con unidades.
 * @param {number} weight - Peso en KG.
 * @returns {string} - Peso formateado (ej: "450 kg").
 */
export function formatWeight(weight) {
  if (!weight && weight !== 0) return '---';
  return `${Number(weight).toLocaleString('es-ES')} kg`;
}