import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: "#18181B",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FAFAFA",
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        P
      </div>
    ),
    {
      ...size,
    }
  )
}
