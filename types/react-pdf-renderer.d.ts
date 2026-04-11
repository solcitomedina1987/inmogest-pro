/** Declaración mínima para compilar sin node_modules; al instalar dependencias, TypeScript usará los tipos del paquete. */
declare module "@react-pdf/renderer" {
  import type { ReactElement } from "react";

  export const Document: (props: { children?: React.ReactNode }) => ReactElement;
  export const Page: (props: {
    size?: string;
    style?: Record<string, unknown>;
    children?: React.ReactNode;
    wrap?: boolean;
  }) => ReactElement;
  export const Text: (props: {
    style?: Record<string, unknown>;
    children?: React.ReactNode;
    wrap?: boolean;
  }) => ReactElement;
  export const View: (props: {
    style?: Record<string, unknown>;
    children?: React.ReactNode;
    fixed?: boolean;
  }) => ReactElement;
  export const StyleSheet: {
    create: <T extends Record<string, Record<string, unknown>>>(styles: T) => T;
  };
  export function pdf(element: ReactElement): {
    toBlob(): Promise<Blob>;
  };
}
