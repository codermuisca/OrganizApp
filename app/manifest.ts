import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OrganizApp2",
    short_name: "OrganizApp2",
    description: "Organiza tareas, actividades y equipos desde un solo lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5fb",
    theme_color: "#7c6cff",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
