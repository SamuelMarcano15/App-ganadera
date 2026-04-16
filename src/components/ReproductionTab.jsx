import React, { useState } from 'react';
import { Baby, Stethoscope, Syringe } from 'lucide-react';
import { GiCow } from 'react-icons/gi'; // <-- NUEVO: Icono de Vaca moderno y limpio
import { FaVenusMars } from 'react-icons/fa6';

import PartosTab from './reproduction/PartosTab';
import TactosTab from './reproduction/TactosTab';
import ServiciosTab from './reproduction/ServiciosTab';

export default function ReproductionTab({ animal }) {
  const [activeSubTab, setActiveSubTab] = useState('partos');
  const animalId = animal?.id;

  const subTabs = [
    { id: 'partos', label: 'Partos', icon: GiCow }, // <-- CAMBIADO: Vaca representando a la madre
    { id: 'tactos', label: 'Tactos', icon: Stethoscope }, // Se mantiene igual
    { id: 'servicios', label: 'Servicios', icon: FaVenusMars }, // <-- CAMBIADO: Símbolos de cruce/reproducción
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Sub-Navegación Pills */}
      <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex flex-row items-center cursor-pointer justify-center gap-1.5 px-2 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab.id
              ? 'bg-[#1B4820] text-white shadow-md'
              : 'bg-white text-gray-500 border border-neutral-200 hover:bg-neutral-50'
              }`}
          >
            <tab.icon size={16} strokeWidth={2.5} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vistas */}
      <div className="space-y-4">
        {activeSubTab === 'partos' && <PartosTab animalId={animalId} />}
        {activeSubTab === 'tactos' && <TactosTab animal={animal} />}
        {activeSubTab === 'servicios' && <ServiciosTab animal={animal} />}
      </div>

    </div>
  );
}
