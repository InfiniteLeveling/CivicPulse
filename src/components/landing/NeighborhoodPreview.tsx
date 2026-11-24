"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Construction, Droplets, Lightbulb, Map, MapPin, Trash2 } from "lucide-react";
import neighborhood from "@/assets/neighborhood.webp";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ComplaintSummary } from "@/types/domain";

const markers = [
  { left: "53%", top: "56%" },
  { left: "74%", top: "30%" },
  { left: "25%", top: "65%" },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case "streetlight":
      return Lightbulb;
    case "water_leakage":
    case "drainage":
      return Droplets;
    case "garbage":
      return Trash2;
    default:
      return Construction;
  }
}

interface NeighborhoodPreviewProps {
  reports?: ComplaintSummary[];
}

export function NeighborhoodPreview({ reports = [] }: NeighborhoodPreviewProps) {
  const featured = reports.slice(0, 3);
  const [selected, setSelected] = useState(0);
  const activeReport = featured[selected];

  function step(offset: number) {
    if (featured.length === 0) return;
    setSelected((current) => (current + offset + featured.length) % featured.length);
  }

  return (
    <figure id="civic-map" tabIndex={-1} aria-label="Live civic map preview" className="map-preview">
      <div className="map-art">
        <Image
          src={neighborhood}
          alt="Illustrated neighborhood with a park, canal and street crossing."
          fill
          preload
          sizes="(min-width: 1280px) 620px, (min-width: 900px) 49vw, 94vw"
          className="object-cover"
        />
        <div className="map-heading">
          <Map aria-hidden="true" size={16} />
          Neighborhood map
        </div>
        {featured.map((item, index) => {
          const Icon = getCategoryIcon(item.category);
          const pos = markers[index % markers.length];
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title.toLowerCase()}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className="map-marker"
              style={{ left: pos.left, top: pos.top, backgroundColor: "var(--primary)" }}
            >
              <Icon aria-hidden="true" size={19} />
            </button>
          );
        })}
      </div>
      <figcaption className="map-detail">
        {activeReport ? (
          <>
            <div aria-live="polite" aria-atomic="true" className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="report-ref">{activeReport.reference}</span>
                <StatusBadge status={activeReport.status} />
              </div>
              <p className="mt-1 text-base leading-snug font-semibold">
                <Link href={`/reports/${activeReport.id}`} className="hover:underline">
                  {activeReport.title}
                </Link>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={13} aria-hidden="true" />
                {activeReport.latitude.toFixed(4)}, {activeReport.longitude.toFixed(4)}
              </p>
            </div>
            {featured.length > 1 && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="map-arrow"
                  aria-label="Previous report"
                  onClick={() => step(-1)}
                >
                  <ChevronLeft aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  className="map-arrow"
                  aria-label="Next report"
                  onClick={() => step(1)}
                >
                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Live Community Map</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Public complaints submitted by residents appear here in real time.
              </p>
            </div>
            <Link href="/map" className="preview-link shrink-0">
              Open Map
            </Link>
          </div>
        )}
      </figcaption>
    </figure>
  );
}
