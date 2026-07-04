import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 140,
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          background: "#98111E",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FDF0D5",
          letterSpacing: "-4px",
        }}
      >
        D
      </div>
    ),
    { ...size }
  );
}
