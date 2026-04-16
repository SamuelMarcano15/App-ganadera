import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SyncManager from '@/components/providers/SyncManager';

// Importaremos las páginas
import Login from './pages/Login';
import Inventario from './pages/Inventario';
import NuevoAnimal from './pages/NuevoAnimal';
import PerfilAnimal from './pages/PerfilAnimal';
import PerfilEvento from './pages/PerfilEvento';
import PerfilServicio from './pages/PerfilServicio';
import PerfilTacto from './pages/PerfilTacto';
import PerfilTratamiento from './pages/PerfilTratamiento';
import TratamientoLote from './pages/TratamientoLote';

export default function App() {
  return (
    <BrowserRouter>
      {/* Manejador de sincronización en segundo plano */}
      <SyncManager />

      <Routes>
        {/* Redirección por defecto: Si entras a la raíz, vas al Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas de la aplicación */}
        <Route path="/login" element={<Login />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/inventario/nuevo" element={<NuevoAnimal />} />
        <Route path="/inventario/perfil" element={<PerfilAnimal />} />
        <Route path="/inventario/perfil/evento" element={<PerfilEvento />} />
        <Route path="/inventario/perfil/servicio" element={<PerfilServicio />} />
        <Route path="/inventario/perfil/tacto" element={<PerfilTacto />} />
        <Route path="/inventario/perfil/tratamiento" element={<PerfilTratamiento />} />
        <Route path="/inventario/tratamiento-lote" element={<TratamientoLote />} />

        {/* Ruta 404: Por seguridad, redirigimos al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}