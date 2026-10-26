import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api-error";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (confirmDisabled || loading) return;
    try {
      setLoading(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(
        getApiErrorMessage(failure, "No se pudo completar la operacion."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !loading) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b-0 pb-2">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && (
          <p role="alert" className="px-6 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="border-t-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : "default"}
            isLoading={loading}
            disabled={confirmDisabled || loading}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
