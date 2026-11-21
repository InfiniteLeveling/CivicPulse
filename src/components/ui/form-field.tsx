"use client";

import { useId, type ReactNode } from "react";
import { Label } from "./label";
import { Spinner } from "./spinner";

interface FieldControlProps {
  id: string;
  required?: boolean;
  disabled?: boolean;
  "aria-busy"?: true;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

interface FormFieldProps {
  id?: string;
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  children: (props: FieldControlProps) => ReactNode;
}

export function FormField({ id, label, helper, error, required, disabled, loading, children }: FormFieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = helper ? controlId + "-hint" : undefined;
  const errorId = error ? controlId + "-error" : undefined;

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={controlId} className="leading-normal">
        {label}{required && <span aria-hidden="true">*</span>}{loading && <Spinner />}
      </Label>
      {children({
        id: controlId, required, disabled: disabled || loading,
        "aria-busy": loading || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {helper && <p id={hintId} className="body-small text-muted-foreground">{helper}</p>}
      {error && <p id={errorId} role="alert" className="body-small font-medium text-destructive">{error}</p>}
    </div>
  );
}
