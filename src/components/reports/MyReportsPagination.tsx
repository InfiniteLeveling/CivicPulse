import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MyReportsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

export function MyReportsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: MyReportsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs sm:text-sm text-muted-foreground border-t border-border/60">
      <div className="text-center sm:text-left">
        Showing{" "}
        <span className="font-medium text-foreground tabular-nums">{from}</span>
        –
        <span className="font-medium text-foreground tabular-nums">{to}</span>{" "}
        of{" "}
        <span className="font-medium text-foreground tabular-nums">{total}</span>{" "}
        reports
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="h-8 px-2.5 gap-1 text-xs"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          <span>Previous</span>
        </Button>

        <span className="text-xs font-medium px-2 tabular-nums">
          Page {page} of {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="h-8 px-2.5 gap-1 text-xs"
        >
          <span>Next</span>
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
