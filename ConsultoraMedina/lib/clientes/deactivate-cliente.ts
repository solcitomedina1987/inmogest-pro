export const ERROR_CONTRATO_VIGENTE_INQUILINO =
  "No se puede dar de baja: El inquilino tiene un contrato vigente";

export type DeactivateClienteResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; code: "CONTRATO_VIGENTE"; error: string }
  | { ok: false; code: "CASCADE_REQUIRED"; activeProperties: number };
