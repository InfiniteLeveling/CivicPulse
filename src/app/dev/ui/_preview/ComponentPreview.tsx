"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/constants";
import { Controls } from "./Controls";
import { Indicators } from "./Indicators";
import { Feedback } from "./Feedback";

const tabs = ["Controls", "Indicators", "Feedback"] as const;

export function ComponentPreview() {
  const [tab, setTab] = useState<string>("Controls");
  return (
    <TooltipProvider delay={350}>
      <header className="bg-foreground text-white">
        <div className="content-container flex min-h-16 items-center justify-between gap-4">
          <BrandLogo inverse />
          <Link href={ROUTES.home} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-white">
            Home <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </header>
      <main className="content-container space-y-6 py-8 sm:space-y-8 sm:py-12">
        <PageHeader title="Component library" description="Explore CivicPulse controls, indicators and feedback states using local demonstration data."
          badge={<Badge variant="outline" className="h-auto rounded-md border-primary/20 bg-primary-light px-2 py-1 text-primary-hover">Development</Badge>} />
        <Tabs value={tab} onValueChange={setTab} className="gap-5">
          <TabsList aria-label="Component groups" className="border bg-card">
            {tabs.map((item) => <TabsTrigger key={item} value={item} className="px-3 sm:px-5">{item}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="Controls"><Controls onShowIndicators={() => setTab("Indicators")} /></TabsContent>
          <TabsContent value="Indicators"><Indicators /></TabsContent>
          <TabsContent value="Feedback"><Feedback /></TabsContent>
        </Tabs>
      </main>
    </TooltipProvider>
  );
}
