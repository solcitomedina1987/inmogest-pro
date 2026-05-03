"use client";

import { ConceptosPagoAdminClient } from "@/components/admin/conceptos-pago-admin-client";
import { NombreCatalogoAdminClient } from "@/components/admin/nombre-catalogo-admin-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConceptoPagoCatalogoRow } from "@/app/actions/config-catalogos";
import {
  createEstadoPropiedad,
  createTipoPropiedad,
  restoreEstadoPropiedad,
  restoreTipoPropiedad,
  softDeleteEstadoPropiedad,
  softDeleteTipoPropiedad,
  updateEstadoPropiedad,
  updateTipoPropiedad,
} from "@/app/actions/config-catalogos";
import type { NombreCatalogoRow } from "@/components/admin/nombre-catalogo-admin-client";

type LoadBlock<T> = { rows: T[]; error: string | null };

type Props = {
  conceptos: LoadBlock<ConceptoPagoCatalogoRow>;
  tipos: LoadBlock<NombreCatalogoRow>;
  estados: LoadBlock<NombreCatalogoRow>;
};

export function AdminGeneralClient({ conceptos, tipos, estados }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ADMIN General</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Catálogos maestros: conceptos de pago, tipos y estados de propiedad.
        </p>
      </div>

      <Tabs defaultValue="conceptos" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="conceptos">Conceptos de pago</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de propiedad</TabsTrigger>
          <TabsTrigger value="estados">Estados de propiedad</TabsTrigger>
        </TabsList>

        <TabsContent value="conceptos" className="mt-6">
          {conceptos.error ? (
            <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6 text-sm">
              <p className="font-medium">No se pudo cargar conceptos de pago</p>
              <p className="text-muted-foreground mt-1">{conceptos.error}</p>
            </div>
          ) : (
            <ConceptosPagoAdminClient initialRows={conceptos.rows} />
          )}
        </TabsContent>

        <TabsContent value="tipos" className="mt-6">
          {tipos.error ? (
            <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6 text-sm">
              <p className="font-medium">No se pudo cargar tipos de propiedad</p>
              <p className="text-muted-foreground mt-1">{tipos.error}</p>
            </div>
          ) : (
            <NombreCatalogoAdminClient
              title="Tipos de propiedad"
              description="Valores disponibles al cargar o editar una propiedad."
              initialRows={tipos.rows}
              onCreate={(nombre) => createTipoPropiedad(nombre)}
              onUpdate={(id, nombre) => updateTipoPropiedad(id, nombre)}
              onSoftDelete={(id) => softDeleteTipoPropiedad(id)}
              onRestore={(id) => restoreTipoPropiedad(id)}
            />
          )}
        </TabsContent>

        <TabsContent value="estados" className="mt-6">
          {estados.error ? (
            <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6 text-sm">
              <p className="font-medium">No se pudo cargar estados de propiedad</p>
              <p className="text-muted-foreground mt-1">{estados.error}</p>
            </div>
          ) : (
            <NombreCatalogoAdminClient
              title="Estados de propiedad"
              description="Valores para el estado comercial de cada propiedad."
              initialRows={estados.rows}
              onCreate={(nombre) => createEstadoPropiedad(nombre)}
              onUpdate={(id, nombre) => updateEstadoPropiedad(id, nombre)}
              onSoftDelete={(id) => softDeleteEstadoPropiedad(id)}
              onRestore={(id) => restoreEstadoPropiedad(id)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
