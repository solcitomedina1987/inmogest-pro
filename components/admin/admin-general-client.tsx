"use client";

import { ConceptosPagoAdminClient } from "@/components/admin/conceptos-pago-admin-client";
import { NombreCatalogoAdminClient } from "@/components/admin/nombre-catalogo-admin-client";
import { AdminUsuariosClient } from "@/components/admin/admin-usuarios-client";
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
import type { PerfilListRow } from "@/components/admin/types";

type LoadBlock<T> = { rows: T[]; error: string | null };

type Props = {
  defaultTab: string;
  conceptos: LoadBlock<ConceptoPagoCatalogoRow>;
  tipos: LoadBlock<NombreCatalogoRow>;
  estados: LoadBlock<NombreCatalogoRow>;
  usuarios: LoadBlock<PerfilListRow>;
  currentUserId: string;
};

export function AdminGeneralClient({
  defaultTab,
  conceptos,
  tipos,
  estados,
  usuarios,
  currentUserId,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ADMIN General</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Catálogos maestros, conceptos de pago y gestión de usuarios del sistema.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4 sm:gap-0">
          <TabsTrigger value="conceptos" className="text-xs sm:text-sm">
            Conceptos de pago
          </TabsTrigger>
          <TabsTrigger value="tipos" className="text-xs sm:text-sm">
            Tipos de propiedad
          </TabsTrigger>
          <TabsTrigger value="estados" className="text-xs sm:text-sm">
            Estados de propiedad
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs sm:text-sm">
            Usuarios
          </TabsTrigger>
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

        <TabsContent value="usuarios" className="mt-6">
          {usuarios.error ? (
            <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-6 text-sm">
              <p className="font-medium">No se pudo cargar el listado de usuarios</p>
              <p className="text-muted-foreground mt-1">{usuarios.error}</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Si falta migración de perfiles (rol, is_active), aplicala en Supabase.
              </p>
            </div>
          ) : (
            <AdminUsuariosClient initial={usuarios.rows} currentUserId={currentUserId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
