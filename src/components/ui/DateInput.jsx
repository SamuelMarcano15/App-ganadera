import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente que soluciona el problema del placeholder en <input type="date">
 * en dispositivos móviles. Mientras está vacío o desenfocado, se comporta
 * como type="text", permitiendo mostrar el placeholder de manera consistente.
 */
export const DateInput = React.forwardRef(({ onBlur, placeholder = "dd/mm/aaaa", className, ...rest }, externalRef) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const localRef = useRef(null);

  // Sincronizar el ref de react-hook-form o cualquier prop con el ref local
  const setRefs = (node) => {
    localRef.current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      externalRef.current = node;
    }
  };

  // Efecto para detectar si hay valor inicial
  useEffect(() => {
    if (rest.value !== undefined) {
      setHasValue(!!rest.value);
    } else if (localRef.current) {
      setHasValue(!!localRef.current.value);
    }
  }, [rest.value]);

  const handleChange = (e) => {
    setHasValue(!!e.target.value);
    if (rest.onChange) rest.onChange(e);
  };

  const handlePointerDown = () => {
    // Forzamos el cambio de "text" a "date" un instante antes de que el evento táctil
    // termine para que el OS abra el selector en el primer click (sin doble toque).
    if (!isFocused && !hasValue) {
      setIsFocused(true);
    }
  };

  const type = (hasValue || isFocused) ? "date" : "text";

  return (
    <input
      type={type}
      ref={setRefs}
      placeholder={placeholder}
      className={className}
      onPointerDown={handlePointerDown}
      onFocus={(e) => {
        setIsFocused(true);
        if (rest.onFocus) rest.onFocus(e);
        // Respaldo de seguridad: intentar disparar el selector manualmente
        try {
          if (e.target.showPicker && e.target.type === 'date') {
            e.target.showPicker();
          }
        } catch (err) {}
      }}
      onBlur={(e) => {
        setIsFocused(false);
        setHasValue(!!e.target.value);
        if (onBlur) onBlur(e);
      }}
      {...rest}
      onChange={handleChange}
    />
  );
});

DateInput.displayName = 'DateInput';
