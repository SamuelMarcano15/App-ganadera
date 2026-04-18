import { supabase } from '@/lib/supabaseClient';

/**
 * Comprime una imagen localmente usando el Canvas del navegador.
 * Redimensiona a un ancho máximo de 800px manteniendo el ratio de aspecto
 * y aplica una compresión JPEG al 70% de calidad.
 * 
 * @param {File | Blob} file El archivo original (File o Blob) capturado por el input
 * @returns {Promise<Blob>} Promesa que resuelve a un nuevo Blob comprimido
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = /** @type {string} */ (event.target?.result);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        
        // Calcular el nuevo tamaño manteniendo la proporción
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Dibujar la imagen redimensionada en el canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Exportar a Blob con formato JPEG y 70% de calidad (0.7)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Fallo al comprimir la imagen en el canvas'));
            }
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen original para comprimir'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo original'));
    };
  });
}

/**
 * Sube un Blob (imagen comprimida) a Supabase Storage y retorna la URL pública.
 * 
 * @param {Blob} blob El archivo binario a subir
 * @param {string} fileName El nombre del archivo (ej: 'evento-204-16982348') sin la extensión
 * @param {string} [bucketName='ganadera_images'] El nombre del bucket en Supabase
 * @returns {Promise<string>} La URL pública de la imagen
 */
export async function uploadImageToSupabase(
  blob, 
  fileName, 
  bucketName = 'ganadera_images'
) {
  
  const fullFileName = `${fileName}.jpg`;

  // 1. Subir la imagen al bucket
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fullFileName, blob, {
      contentType: 'image/jpeg',
      upsert: true // Si el archivo ya existe con ese nombre, lo sobreescribe
    });

  if (uploadError) {
    console.error('[Storage] Error subiendo imagen:', uploadError);
    throw uploadError;
  }

  // 2. Obtener la URL pública generada
  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fullFileName);

  return `${publicUrlData.publicUrl}?t=${Date.now()}`;
}
