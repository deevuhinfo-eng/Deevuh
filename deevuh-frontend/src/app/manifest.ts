import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DEEVUH — Where Divine Meets Contemporary",
    short_name: "DEEVUH",
    description:
      "Discover curated luxury fashion that bridges tradition and modernity. Premium Indian fashion with editorial aesthetics and artisanal craftsmanship.",
    start_url: "/",
    display: "standalone",
    background_color: "#FDF0D5",
    theme_color: "#98111E",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
