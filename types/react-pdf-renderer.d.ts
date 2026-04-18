/** Declaración mínima para compilar sin node_modules; al instalar dependencias, TypeScript usará los tipos del paquete. */
declare module "@react-pdf/renderer" {
  import type { ReactElement } from "react";

  type PdfStyle = Record<string, unknown> | Record<string, unknown>[];

  export const Document: (props: { children?: React.ReactNode }) => ReactElement;
  export const Page: (props: {
    size?: string;
    style?: PdfStyle;
    children?: React.ReactNode;
    wrap?: boolean;
  }) => ReactElement;
  export const Text: (props: {
    style?: PdfStyle;
    children?: React.ReactNode;
    wrap?: boolean;
  }) => ReactElement;
  export const View: (props: {
    style?: PdfStyle;
    children?: React.ReactNode;
    fixed?: boolean;
    wrap?: boolean;
  }) => ReactElement;
  export const Image: (props: {
    src: string;
    style?: PdfStyle;
  }) => ReactElement;
  export const StyleSheet: {
    create: <T extends Record<string, Record<string, unknown>>>(styles: T) => T;
  };
  export function pdf(element: ReactElement): {
    toBlob(): Promise<Blob>;
  };
}
