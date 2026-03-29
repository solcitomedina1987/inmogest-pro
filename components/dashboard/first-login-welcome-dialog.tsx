"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_NAME } from "@/lib/constants/branding";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FirstLoginWelcomeDialog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("first_login") === "true") {
      setOpen(true);
    }
  }, [searchParams]);

  function handleComenzar() {
    setOpen(false);
    router.replace("/dashboard", { scroll: false });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleComenzar();
        }
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-balance text-left text-xl">
            ¡Bienvenido/a a {BRAND_NAME}!{" "}
            <span role="img" aria-label="Celebración">
              🎉
            </span>
          </DialogTitle>
          <DialogDescription className="text-left text-base text-stone-700">
            Tu cuenta ha sido verificada con éxito. Ya podés comenzar a gestionar tus propiedades y clientes desde
            tu panel de control.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          <Button type="button" className="w-full sm:w-auto" onClick={handleComenzar}>
            Comenzar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
