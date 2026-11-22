"use client";

import { useRef, useState, type ReactElement } from "react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel, cancelLabel = "Cancel", onConfirm, destructive, loading = false }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const busy = pending || loading;

  async function confirm() {
    if (running.current || loading) return;
    running.current = true;
    setPending(true);
    setFailed(false);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (running.current || loading) return;
      setFailed(false);
      setOpen(next);
    }}>
      <AlertDialogTrigger render={trigger} disabled={loading || undefined} />
      <AlertDialogContent initialFocus={cancel}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && <p role="alert" className="text-sm text-destructive">The action could not be completed. Try again.</p>}
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancel} disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "primary"} loading={busy} onClick={confirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
