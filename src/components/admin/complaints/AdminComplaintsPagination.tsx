import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminComplaintsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminComplaintsPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: AdminComplaintsPaginationProps) {
  if (total <= 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
      <p className="text-xs text-muted-foreground">
        Showing <strong className="text-foreground font-medium">{startItem}</strong>–
        <strong className="text-foreground font-medium">{endItem}</strong> of{" "}
        <strong className="text-foreground font-medium">{total}</strong> complaints
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="h-8 text-xs gap-1"
          >
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            <span>Previous</span>
          </Button>

          <span className="text-xs text-muted-foreground px-1 tabular-nums">
            Page {page} of {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="h-8 text-xs gap-1"
          >
            <span>Next</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
