"use client";

import { useEffect } from "react";

/** Tras montar, dispara el diálogo de impresión del navegador (vista HTML). */
export function AutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
