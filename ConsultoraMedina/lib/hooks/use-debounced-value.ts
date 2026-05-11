"use client";

import { useEffect, useState } from "react";

/** Devuelve `value` estabilizado tras `delayMs` sin cambios (útil para filtrar mientras se escribe). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
