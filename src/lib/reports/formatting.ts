/**
 * CivicPulse complaint date & time formatting utilities.
 * Deterministic UTC formatting prevents hydration mismatches between SSR and client.
 */

export function formatReportDate(
  dateValue: string | number | Date | null | undefined
): string {
  if (dateValue === null || dateValue === undefined || dateValue === "") {
    return "Unknown date";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatReportTime(
  dateValue: string | number | Date | null | undefined
): string {
  if (dateValue === null || dateValue === undefined || dateValue === "") {
    return "";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}

export function formatReportDateTime(
  dateValue: string | number | Date | null | undefined
): string {
  if (dateValue === null || dateValue === undefined || dateValue === "") {
    return "Unknown date";
  }

  const dateStr = formatReportDate(dateValue);
  const timeStr = formatReportTime(dateValue);

  return timeStr ? `${dateStr} at ${timeStr} UTC` : dateStr;
}
