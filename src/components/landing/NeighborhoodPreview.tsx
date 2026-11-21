"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Construction, Droplets, Lightbulb, Map, MapPin } from "lucide-react";
import neighborhood from "@/assets/neighborhood.webp";
import { StatusBadge } from "@/components/common/StatusBadge";
import { demoReports } from "./demo-reports";

const markers = [
  { icon: Construction, left: "53%", top: "56%", color: "var(--primary)" },
  { icon: Lightbulb, left: "74%", top: "30%", color: "var(--high)" },
  { icon: Droplets, left: "25%", top: "65%", color: "var(--resolved)" },
];

export function NeighborhoodPreview() {
  const [selected, setSelected] = useState(0);
  const report = demoReports[selected];
  function step(offset: number) {
    setSelected((current) => (current + offset + demoReports.length) % demoReports.length);
  }

  return (
    <figure id="civic-map" tabIndex={-1} aria-label="Civic map demonstration" className="map-preview">
      <div className="map-art">
        <Image src={neighborhood} alt="Illustrated neighborhood with a park, canal and street crossing."
          fill preload sizes="(min-width: 1280px) 620px, (min-width: 900px) 49vw, 94vw" className="object-cover" />
        <div className="map-heading"><Map aria-hidden="true" size={16} />Neighborhood map</div>
        <span className="demo-stamp">Demo preview</span>
        {demoReports.map((item, index) => {
          const { icon: Icon, left, top, color } = markers[index];
          return (
            <button key={item.reference} type="button" aria-label={`Show ${item.title.toLowerCase()}`}
              aria-pressed={selected === index} onClick={() => setSelected(index)} className="map-marker"
              style={{ left, top, backgroundColor: color }}>
              <Icon aria-hidden="true" size={19} />
            </button>
          );
        })}
      </div>
      <figcaption className="map-detail">
        <div aria-live="polite" aria-atomic="true" className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="report-ref">{report.reference}</span><StatusBadge status={report.status} /></div>
          <p className="mt-1 text-base leading-snug font-semibold">{report.title}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13} aria-hidden="true" />{report.location}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="map-arrow" aria-label="Previous sample report" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" size={17} /></button>
          <button type="button" className="map-arrow" aria-label="Next sample report" onClick={() => step(1)}><ChevronRight aria-hidden="true" size={17} /></button>
        </div>
      </figcaption>
    </figure>
  );
}
