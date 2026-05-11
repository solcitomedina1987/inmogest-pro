"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function RestriccionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restringido = searchParams.get("restringido") === "1";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(restringido);
  }, [restringido]);

  function volverInicio() {
    setOpen(false);
    router.replace("/dashboard");
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          volverInicio();
        }
      }}
    >
      <AlertDialogContent className="z-[200] max-w-md shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Sección restringida</AlertDialogTitle>
          <AlertDialogDescription className="text-base font-medium text-foreground/90">
            Esta sección está solo disponible para usuarios Administradores, contacta con uno para modificar tus
            permisos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              volverInicio();
            }}
          >
            Volver al Inicio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DashboardRestriccionAlert() {
  return (
    <Suspense fallback={null}>
      <RestriccionInner />
    </Suspense>
  );
}
