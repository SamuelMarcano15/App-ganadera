
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export default function AnimalImage({ 
  photoPath, 
  photoBlob, 
  alt, 
  className = "", 
  sex = "Hembra", 
  birthDate = null 
}) {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgError, setImgError] = useState(false);

  // --- 0. INTELIGENCIA PARA AUTODESCUBRIR DATOS ---
  const animalNumber = alt ? String(alt).replace('#', '').trim() : null;

  const dbAnimal = useLiveQuery(() => {
    if (!animalNumber || animalNumber.length > 15 || animalNumber.toLowerCase().includes('foto')) {
      return null;
    }
    return db.animals.where('number').equals(animalNumber).first();
  }, [animalNumber]);

  // --- 1. PROCESAR IMAGEN REAL ---
  useEffect(() => {
    setImgError(false);
    if (photoPath) {
      setImgSrc(photoPath);
    } else if (photoBlob) {
      const url = URL.createObjectURL(photoBlob);
      setImgSrc(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImgSrc(null);
    }
  }, [photoPath, photoBlob]);

  // --- 2. LÓGICA DE ICONO ---
  const finalSex = dbAnimal?.sex || sex;
  const finalBirthDate = dbAnimal?.birth_date || birthDate;
  let isBecerro = false;

  if (finalBirthDate) {
    const months = (new Date() - new Date(finalBirthDate)) / (1000 * 60 * 60 * 24 * 30.44);
    if (months < 12) isBecerro = true;
  } else if (alt && (alt.toLowerCase().includes('nacer') || alt.toLowerCase().includes('destete'))) {
    isBecerro = true;
  }

  let placeholderSrc = '/placeholders/vaca.png';
  if (isBecerro) {
    placeholderSrc = '/placeholders/becerro.png';
  } else if (finalSex === 'Macho') {
    placeholderSrc = '/placeholders/toro.png';
  }

  // --- RENDER ---
  if (!imgSrc || imgError) {
    return (
      <div className={`flex items-center justify-center bg-[#E5E7EB] w-full h-full ${className}`}>
        <img 
          src={placeholderSrc} 
          alt="Silueta" 
          /* CAMBIO CLAVE: 
             1. p-[15%]: El padding ahora es relativo al tamaño del círculo.
             2. opacity-20: Un poco más sutil para que se vea más profesional.
          */
          className="w-full h-full p-[18%] object-contain opacity-30 mix-blend-multiply drop-shadow-sm transition-all" 
        />
      </div>
    );
  }

  return (
    <img 
      src={imgSrc} 
      alt={alt || "Animal"} 
      className={`object-cover w-full h-full ${className}`}
      onError={() => setImgError(true)}
    />
  );
}