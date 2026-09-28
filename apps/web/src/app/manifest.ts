import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/month-end/app",
    name: "Month End",
    short_name: "Month End",
    description: "Secure inventory operations for hospitality teams.",
    start_url: "/month-end/app",
    scope: "/month-end/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#17221b",
    icons: [
      {
        src: "/month-end/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
