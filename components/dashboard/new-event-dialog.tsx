"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { LABEL_TIPO_EVENTO, type TipoEventoPersonalizado } from "@/lib/google/calendar-types";

// ── Tipos locales ─────────────────────────────────────────────────────────────

type ClienteRow = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  tipo: string;
};

type PropiedadRow = {
  id: string;
  direccion: string;
  estado: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPOS: TipoEventoPersonalizado[] = [
  "visita_inquilino",
  "visita_propietario",
  "muestra_propiedad",
  "tramite",
];

export function NewEventDialog({ open, onClose, onCreated }: Props) {
  // Selector data
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [propiedades, setPropiedades] = useState<PropiedadRow[]>([]);

  // Form state
  const [tipo, setTipo] = useState<TipoEventoPersonalizado | "">("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [propiedadId, setPropiedadId] = useState("");
  const [nombreInteresado, setNombreInteresado] = useState("");
  const [telefonoInteresado, setTelefonoInteresado] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load clients & properties once
  useEffect(() => {
    if (!open) return;
    fetch("/api/calendar/selector-data")
      .then((r) => r.json())
      .then((d) => {
        setClientes(d.clientes ?? []);
        setPropiedades(d.propiedades ?? []);
      })
      .catch(() => {});
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTipo("");
      setFecha("");
      setHora("");
      setNotas("");
      setClienteId("");
      setPropiedadId("");
      setNombreInteresado("");
      setTelefonoInteresado("");
    }
  }, [open]);

  // Filtered clients
  const inquilinos = clientes.filter((c) =>
    c.tipo?.toLowerCase().includes("inquilino"),
  );
  const propietarios = clientes.filter((c) =>
    c.tipo?.toLowerCase().includes("propietario"),
  );

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const propiedadSeleccionada = propiedades.find((p) => p.id === propiedadId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo || !fecha) {
      toast.error("Tipo y fecha son obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string | undefined> = {
        tipo,
        fecha,
        hora: hora || undefined,
        notas: notas || undefined,
      };

      if (tipo === "visita_inquilino" && clienteSeleccionado) {
        payload.nombreCliente = `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`;
        payload.telefonoCliente = clienteSeleccionado.telefono ?? undefined;
      }
      if (tipo === "visita_propietario" && clienteSeleccionado) {
        payload.nombreCliente = `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`;
        payload.telefonoCliente = clienteSeleccionado.telefono ?? undefined;
      }
      if (tipo === "muestra_propiedad") {
        if (propiedadSeleccionada) {
          payload.nombrePropiedad = propiedadSeleccionada.direccion;
        }
        if (nombreInteresado) payload.nombreInteresado = nombreInteresado;
        if (telefonoInteresado) payload.telefonoInteresado = telefonoInteresado;
      }

      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Error al crear evento");

      toast.success("Evento creado en Google Calendar.");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear evento");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-emerald-600" />
            Nuevo Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo">Tipo de evento *</Label>
            <Select
              value={tipo}
              onValueChange={(v) => {
                setTipo(v as TipoEventoPersonalizado);
                setClienteId("");
                setPropiedadId("");
                setNombreInteresado("");
                setTelefonoInteresado("");
              }}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Seleccionar tipo…" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LABEL_TIPO_EVENTO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hora">Horario</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>

          {/* Campos condicionales */}
          {tipo === "visita_inquilino" && (
            <div className="flex flex-col gap-1.5">
              <Label>Inquilino</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar inquilino…" />
                </SelectTrigger>
                <SelectContent>
                  {inquilinos.length === 0 && (
                    <SelectItem value="_none" disabled>
                      Sin inquilinos registrados
                    </SelectItem>
                  )}
                  {inquilinos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.apellido}, {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "visita_propietario" && (
            <div className="flex flex-col gap-1.5">
              <Label>Propietario</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar propietario…" />
                </SelectTrigger>
                <SelectContent>
                  {propietarios.length === 0 && (
                    <SelectItem value="_none" disabled>
                      Sin propietarios registrados
                    </SelectItem>
                  )}
                  {propietarios.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.apellido}, {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === "muestra_propiedad" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Propiedad</Label>
                <Select value={propiedadId} onValueChange={setPropiedadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar propiedad…" />
                  </SelectTrigger>
                  <SelectContent>
                    {propiedades.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.direccion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="interesado">Nombre del interesado</Label>
                  <Input
                    id="interesado"
                    placeholder="Nombre y apellido"
                    value={nombreInteresado}
                    onChange={(e) => setNombreInteresado(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="telinteresado">Teléfono</Label>
                  <Input
                    id="telinteresado"
                    placeholder="+549…"
                    value={telefonoInteresado}
                    onChange={(e) => setTelefonoInteresado(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              placeholder="Observaciones opcionales…"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !tipo || !fecha}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <><Loader2 className="size-4 animate-spin mr-1.5" /> Guardando…</>
              ) : (
                <><CalendarPlus className="size-4 mr-1.5" /> Crear evento</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
