"use client";

import { useState, type ReactNode } from "react";
import { Box, FlaskConical } from "lucide-react";

type Tab = { slug: "experimental" | "control"; name: string; alert: boolean; panel: ReactNode };

/** Phone-only compartment toggle (`.seg`). Desktop shows both side by side. */
export function CompartmentTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.slug ?? "experimental");
  const current = tabs.find((tab) => tab.slug === active) ?? tabs[0];
  return (
    <>
      <div role="tablist" aria-label="Compartment" className="flex rounded-md bg-border p-1">
        {tabs.map((tab) => {
          const selected = tab.slug === current?.slug;
          const Icon = tab.slug === "experimental" ? FlaskConical : Box;
          return (
            <button
              key={tab.slug}
              type="button"
              role="tab"
              id={`tab-${tab.slug}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.slug}`}
              onClick={() => setActive(tab.slug)}
              className={
                "interactive flex h-11 flex-1 items-center justify-center gap-2 rounded-sm text-sm font-semibold " +
                (selected ? "bg-surface text-text shadow-sm" : "text-subtle hover:text-text")
              }
            >
              <Icon size={18} aria-hidden />
              {tab.name}
              {tab.alert ? (
                <span className="size-2 rounded-full bg-danger-accent">
                  <span className="sr-only">has an alert</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {current ? (
        <div role="tabpanel" id={`panel-${current.slug}`} aria-labelledby={`tab-${current.slug}`} className="flex flex-col gap-3">
          {current.panel}
        </div>
      ) : null}
    </>
  );
}
