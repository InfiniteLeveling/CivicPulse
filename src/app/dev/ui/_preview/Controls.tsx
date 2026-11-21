import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Panel } from "./Panel";

const schema = z.object({
  title: z.string().trim().min(1, "Enter an example title."),
  email: z.email("Enter a valid email address."),
});
const blank = { title: "", email: "" };
const example = { title: "Field preview", email: "sample@example.com" };
const sizes = ["sm", "default", "lg"] as const;

function VariantRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function Controls({ onShowIndicators }: { onShowIndicators: () => void }) {
  const form = useForm({ defaultValues: blank, resolver: zodResolver(schema) });
  const [showPassword, setShowPassword] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [state, setState] = useState("Normal");
  const [size, setSize] = useState<(typeof sizes)[number]>("default");
  const [result, setResult] = useState("");
  const errors = form.formState.errors;
  const formState = { disabled: state === "Disabled", loading: state === "Loading" };
  const readOnly = state === "Read-only";

  function setValues(values: typeof blank, message: string) {
    form.reset(values);
    setResult(message);
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel title="Form controls">
        <form id="preview-form" noValidate className="grid gap-5"
          onChange={() => setResult("")}
          onSubmit={form.handleSubmit(() => setResult("Example values are valid."), () => setResult("Check the marked fields."))}>
          <FormField label="Example title" required error={errors.title?.message} {...formState}
            helper={showHints ? "Use a short title to try field validation." : undefined}>
            {(props) => <Input {...form.register("title")} {...props} readOnly={readOnly} autoComplete="off" />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Sample email" required error={errors.email?.message} {...formState}>
              {(props) => <Input type="email" autoComplete="off" {...form.register("email")} {...props} readOnly={readOnly} />}
            </FormField>
            <FormField label="Sample password" {...formState}>
              {(props) => <div className="relative">
                <Input {...props} readOnly={readOnly} type={showPassword ? "text" : "password"} autoComplete="new-password" className="pr-12" />
                <Tooltip>
                  <TooltipTrigger render={<Button type="button" size="icon" variant="ghost" disabled={props.disabled}
                    aria-label={showPassword ? "Hide sample password" : "Show sample password"}
                    onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0" />}>
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </TooltipTrigger>
                  <TooltipContent>{showPassword ? "Hide password" : "Show password"}</TooltipContent>
                </Tooltip>
              </div>}
            </FormField>
          </div>
          <FormField label="Sample notes" {...formState}>
            {(props) => <Textarea {...props} readOnly={readOnly} rows={3} />}
          </FormField>
        </form>
        <Separator />
        <fieldset>
          <legend className="mb-1 font-medium" id="state-legend">Field state</legend>
          <RadioGroup aria-labelledby="state-legend" value={state} onValueChange={setState} className="flex flex-wrap gap-x-4">
            {["Normal", "Read-only", "Disabled", "Loading"].map((item) => (
              <Label key={item} className="min-h-11 cursor-pointer"><RadioGroupItem value={item} />{item}</Label>
            ))}
          </RadioGroup>
        </fieldset>
      </Panel>
      <Panel title="Button variants">
        <FormField label="Button size">{(props) => (
          <NativeSelect {...props} value={size} onChange={(event) => {
            const selected = sizes.find((item) => item === event.target.value);
            if (selected) setSize(selected);
          }}>
            <option value="sm">Small</option><option value="default">Default</option><option value="lg">Large</option>
          </NativeSelect>
        )}</FormField>
        <div className="divide-y rounded-md border px-3">
          <VariantRow label="Primary">
            <Button size={size} type="submit" form="preview-form" loading={formState.loading} disabled={formState.disabled}>
              Validate fields
            </Button>
          </VariantRow>
          <VariantRow label="Secondary">
            <Button size={size} variant="secondary" onClick={() => setValues(example, "Sample values filled.")}>
              Fill example
            </Button>
          </VariantRow>
          <VariantRow label="Outline">
            <Button size={size} variant="outline" onClick={() => {
              form.clearErrors();
              setResult("Validation messages reset.");
            }}>Reset messages</Button>
          </VariantRow>
          <VariantRow label="Ghost">
            <Button size={size} variant="ghost" aria-pressed={showHints} onClick={() => setShowHints(!showHints)}>
              {showHints ? "Hide hints" : "Show hints"}
            </Button>
          </VariantRow>
          <VariantRow label="Destructive">
            <ConfirmDialog
              title="Clear example values?"
              description="This clears the title and email in this preview."
              confirmLabel="Clear values"
              destructive
              trigger={<Button variant="destructive" size={size}>Clear example</Button>}
              onConfirm={() => setValues(blank, "Example values cleared.")}
            />
          </VariantRow>
          <VariantRow label="Link">
            <Button size={size} variant="link" onClick={onShowIndicators}>View indicators</Button>
          </VariantRow>
        </div>
        <p role="status" className="min-h-5 text-sm text-muted-foreground">{result}</p>
      </Panel>
    </div>
  );
}
