import type { MetadataRoute } from "next";

// Necessario per installare l'app sulla schermata Home: su iPhone è l'unico
// modo per ricevere le notifiche push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AquaClass Connect",
    short_name: "AquaClass",
    description: "Calendario, presenze e richieste delle lezioni di nuoto per le scuole",
    // "/" smista: staff al proprio pannello, maestre alla scuola/classe ricordata
    start_url: "/",
    display: "standalone",
    background_color: "#F3F8FF",
    theme_color: "#0052CC",
    lang: "it",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
