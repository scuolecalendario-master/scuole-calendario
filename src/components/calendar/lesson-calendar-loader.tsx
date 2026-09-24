"use client";

import dynamic from "next/dynamic";

// FullCalendar dipende dal browser (dimensioni, fuso orario, media query):
// lo carichiamo solo lato client per evitare differenze di idratazione.
export const LessonCalendarLoader = dynamic(
  () => import("./lesson-calendar").then((m) => m.LessonCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-xl border text-sm text-muted-foreground">
        Caricamento calendario…
      </div>
    ),
  },
);
