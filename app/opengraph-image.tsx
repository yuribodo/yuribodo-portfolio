import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Yuri Bodo | Creative Frontend Developer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const archivoBlack = await readFile(
    join(process.cwd(), "public/fonts/Archivo-Black.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1a1a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Diagonal gradient beam — inspired by the hero */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "900px",
            height: "1200px",
            background:
              "linear-gradient(135deg, rgba(250,75,18,0.35) 0%, rgba(250,75,18,0.08) 40%, transparent 70%)",
            transform: "rotate(-15deg)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-300px",
            left: "-100px",
            width: "600px",
            height: "800px",
            background:
              "linear-gradient(135deg, rgba(159,84,84,0.2) 0%, transparent 60%)",
            transform: "rotate(-15deg)",
            display: "flex",
          }}
        />

        {/* Name */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "baseline",
            gap: "24px",
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontFamily: "Archivo",
              fontWeight: 900,
              color: "#ede4df",
              letterSpacing: "-2px",
            }}
          >
            YURI
          </span>
          <span
            style={{
              fontSize: 120,
              fontFamily: "Archivo",
              fontWeight: 900,
              color: "#fa4b12",
              letterSpacing: "-2px",
            }}
          >
            BODO
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontFamily: "Archivo",
              fontWeight: 600,
              color: "#cfbfb6",
              letterSpacing: "8px",
              textTransform: "uppercase" as const,
            }}
          >
            Full Stack Engineer
          </span>
          <span
            style={{
              fontSize: 16,
              fontFamily: "Archivo",
              fontWeight: 400,
              color: "#9f5454",
              letterSpacing: "4px",
            }}
          >
            TypeScript · React · Node.js · Go · Python
          </span>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            background:
              "linear-gradient(90deg, transparent 0%, #fa4b12 50%, transparent 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Archivo",
          data: archivoBlack,
          style: "normal" as const,
          weight: 900 as const,
        },
      ],
    }
  );
}
