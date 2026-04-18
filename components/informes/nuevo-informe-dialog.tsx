"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generarInformeRendicion } from "@/app/actions/informes-rendicion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type PropietarioOption = { id: string; label: string };

function mesAnteriorYYYYMM(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DIALOG_SELECT_CLASS =
  "z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propietarios: PropietarioOption[];
};

export function NuevoInformeDialog({ open, onOpenChange, propietarios }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [propietarioId, setPropietarioId] = useState("");
  const [mesPeriodo, setMesPeriodo] = useState(mesAnteriorYYYYMM());
  const [comision, setComision] = useState("5");

  useEffect(() => {
    if (open) {
      setError(null);
      setPropietarioId("");
      setMesPeriodo(mesAnteriorYYYYMM());
      setComision("5");
    }
  }, [open]);

  function generar() {
    if (!propietarioId) {
      setError("Seleccioná un propietario.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await generarInformeRendicion({
        propietario_cliente_id: propietarioId,
        mes_periodo: mesPeriodo,
        comision_porcentaje: Number(comision),
      });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Informe generado.");
      onOpenChange(false);
      router.push(`/dashboard/informes/${res.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo informe de rendición</DialogTitle>
          <DialogDescription>
            Se toman los pagos <strong>Pagado</strong> del período (mes devengado) en contratos de cobranzas de las
            propiedades del propietario. La comisión se calcula solo sobre el total de alquileres.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Propietario</Label>
            <Select value={propietarioId || undefined} onValueChange={setPropietarioId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent className={DIALOG_SELECT_CLASS}>
                {propietarios.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf-mes">Período a rendir</Label>
            <Input id="inf-mes" type="month" value={mesPeriodo} onChange={(e) => setMesPeriodo(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf-com">Comisión inmobiliaria (%)</Label>
            <Input
              id="inf-com"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={comision}
              onChange={(e) => setComision(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" onClick={generar} disabled={pending || propietarios.length === 0}>
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Generando…
              </span>
            ) : (
              "Generar informe"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
