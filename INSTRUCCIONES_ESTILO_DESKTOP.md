# Instrucciones de Recuperación de Estilos (Desktop vs Mobile) para React/Vite

**Atención al Agente Asignado a la Migración de Vite:**
La primera fase de renderizado móvil (`< sm`) ha sido un éxito absoluto y los estilos funcionan de manera impecable. Sin embargo, **la vista Desktop (Tablet y Pantallas Grandes) colapsó** porque la arquitectura global está acotando indebidamente el área observable a las vistas superiores.

El error principal radica en aplicar la clase `.mobile-shell` —la cual fue diseñada **exclusivamente** para simular la pantalla de un móvil de 500px— alrededor del enrutador principal en `App.jsx`.

Sigue estas directrices exactas y comprobadas del proyecto original en Next.js para restaurar el esplendor Desktop sin tocar ni alterar el modo Mobile.

---

## 1. Liberación del Enrutador Global (`src/App.jsx`)

**Diagnóstico:** El enrutador de Vite tiene envueltas las `<Routes>` en etiquetas `<div className="mobile-shell-wrapper"><div className="mobile-shell">...</div></div>`. Esto estrangula el Dashboard a 500px en monitores grandes.

**Instrucción:** 
Elimina esas dos capas de `div` en `src/App.jsx`. Las rutas deben quedar libres y ancladas directamente al `div#root` (o al contexto sin márgenes físicos añadidos).

```jsx
// CORRECTO (src/App.jsx):
export default function App() {
  return (
    <BrowserRouter>
      <SyncManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/inventario" element={<Inventario />} />
        {/* ... */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 2. Restauración Estética de la Fachada: El Login (`src/pages/Login.jsx`)

**Instrucción:**
El entorno `.mobile-shell` es un recurso de diseño enfocado a centralizar interfaces puntuales (como una terminal móvil sobre una mesa blanca). **Traspasa las clases globales que borraste de App.jsx directamente a `Login.jsx`**.

```jsx
// CORRECTO (src/pages/Login.jsx):
export default function Login() {
  return (
    <div className="mobile-shell-wrapper">      {/* <- Centro absoluto desktop, fondo gris */}
      <div className="mobile-shell bg-surface-container-low">  {/* <- Contenedor blanco max 500px */}
        <div className="flex flex-col items-center pt-[clamp(56px,12vh,80px)] px-6 pb-10">
          {/* Formulario y Logo */}
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Recuperación del Ancho Fluido: El Dashboard (`src/pages/Inventario.jsx`)

Aquí reside la clave para que en monitores de PC veamos un inventario premium: Tailwind dictamina una expansión horizontal ("fluid grid") en el proyecto SSR, que tú replicarás en Vite.

**Instrucciones de Grid y Contenedor:**
1.  **Fondo Absoluto:** El `<main>` superior usa `min-h-screen bg-[#F0F2EB]`. Esto ocupará toda la pantalla de la laptop.
2.  **Top Header Navbar Exclusivo Desktop:** Aplique el header con fondo de barra completa en modo mediano: `bg-white md:bg-[#1B4820] w-full px-4 pt-6 pb-4 md:py-4 md:px-8`.
3.  **Contención Selectiva (El Secreto de Next.js):** Debajo del Navbar, TODO el listado y sus controles usan un max-width central para que la grilla de animales no quede colgada de los bordes del monitor:
    *   Usa siempre `<div className="max-w-7xl mx-auto px-4 md:px-8 mt-5 md:mt-8 relative z-0">`.
4.  **Restauración del Grid Responsive (Esencial):** La magia de Desktop es la subdivisión. Tu `<div className="grid">` **debe conservar** estas clases literalmente (sin borrar nada de la versión de Next.js):
    *   `className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"`
    *   Este sistema permitirá que Desktop use 4 o 5 columnas, manteniendo 2 en móviles.

---

## 4. Estabilización de los Perfiles (`src/pages/PerfilAnimal.jsx`)

Para las sub-vistas del animal, el comportamiento es similar: fluido en contenedor pero delimitado.

**Instrucciones:**
1.  **Contenedor Maestro de Ficha:** Debajo de su barra verde y botón de "Volver", engloba todo en un `<div className="max-w-6xl mx-auto">`.
2.  **Solapas de Navegación (Tabs) de Escritorio:** En móvil usa un fixed bottom bar imperativo. Pero para PC debe prevalecer su menú superior fijado:
    *   `<nav className="hidden md:flex items-center justify-center gap-8 border-b mb-6 px-8 sticky top-[72px] z-20">`

---

## Resumen Ejecutivo para la UI (Métrica de Éxito)

El layout en Desktop no debe depender del CSS Customizado del archivo global, sino exclusivamente de los **Breakpoints Nativos de Tailwind CSS** pre-definidos en el código (los prefijos `md:` y `lg:`). Si mueves el envoltorio `.mobile-shell` localizándolo en el componente `Login` en lugar de aislar tu archivo raíz `App.jsx`, lograrás tener exactamente la misma calidad responsiva del diseño de Vercel/NextJS.
