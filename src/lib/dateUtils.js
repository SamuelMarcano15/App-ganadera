import { differenceInMonths, differenceInYears, formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula la edad de un animal de forma legible.
 * @param {string | Date} birthDate - Fecha de nacimiento.
 * @returns {string} - Edad formateada (ej: "2 años 3 meses", "1 mes", "15 días").
 */
export function calculateAge(birthDate) {
  if (!birthDate) return 'Desconocida';

  const birth = new Date(birthDate);
  const now = new Date();

  if (birth > now) return 'Fecha futura';

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
