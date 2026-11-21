import { MapPin, ExternalLink } from "lucide-react";
import { formatCoordinate } from "@/lib/validation/location";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportLocationPreviewProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  title?: string;
}

export function ReportLocationPreview({
  latitude,
  longitude,
  title,
}: ReportLocationPreviewProps) {
  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);

  if (!hasCoordinates) {
    return (
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            <span>Issue Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Geographic coordinates were not recorded for this complaint.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latFormatted = formatCoordinate(latitude, 5);
  const lngFormatted = formatCoordinate(longitude, 5);
  const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            <span>Issue Location</span>
          </h2>

          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <span>OpenStreetMap</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Coordinate details */}
        <div className="flex items-center gap-4 text-xs sm:text-sm bg-muted/40 p-3 rounded-lg border border-border/60">
          <div>
            <span className="text-muted-foreground font-medium">Latitude: </span>
            <span className="font-mono font-semibold text-foreground">{latFormatted}° N</span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Longitude: </span>
            <span className="font-mono font-semibold text-foreground">{lngFormatted}° E</span>
          </div>
        </div>

        {/* Read-only map representation */}
        <div
          className="relative w-full h-[180px] sm:h-[220px] rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center text-center p-4"
          role="region"
          aria-label={title ? `Location map for ${title}` : "Complaint location preview"}
        >
          {/* Static OpenStreetMap tile visual background */}
          <div className="space-y-1.5 z-10 bg-background/90 backdrop-blur-xs p-3 rounded-lg border shadow-xs max-w-xs">
            <div className="flex items-center justify-center gap-1.5 text-primary font-semibold text-xs sm:text-sm">
              <MapPin className="size-4 shrink-0 animate-bounce" aria-hidden="true" />
              <span>Confirmed Incident Pin</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {latFormatted}, {lngFormatted}
            </p>
          </div>

          <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded pointer-events-none">
            © OpenStreetMap contributors
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
