import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MyReportsSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MyReportsSearch({
  value,
  onChange,
  className,
}: MyReportsSearchProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, reference (CP-...), or category..."
        aria-label="Search complaints"
        className="pl-9 pr-9 h-9 w-full bg-background border-input text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search query"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
