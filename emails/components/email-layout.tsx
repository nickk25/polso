import {
  Html,
  Head,
  Body,
  Container,
  Tailwind,
  Text,
  Link,
  Hr,
  Font,
  pixelBasedPreset,
} from "@react-email/components"

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                brand: "#18181B",
                muted: "#71717A",
                subtle: "#a1a1aa",
              },
            },
          },
        }}
      >
        <Head>
          <Font
            fontFamily="JetBrains Mono"
            fallbackFontFamily="monospace"
            webFont={{
              url: "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
        <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif", margin: 0, padding: "40px 0" }}>
          <Container style={{ backgroundColor: "#ffffff", maxWidth: "520px", margin: "0 auto", padding: "40px" }}>
            {/* Logo */}
            <table cellPadding="0" cellSpacing="0" role="presentation">
              <tr>
                <td
                  style={{
                    backgroundColor: "#18181B",
                    width: "28px",
                    height: "28px",
                    textAlign: "center",
                    verticalAlign: "middle",
                  }}
                >
                  <Text
                    style={{
                      color: "#FAFAFA",
                      fontSize: "14px",
                      fontWeight: "700",
                      margin: "0",
                      lineHeight: "28px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    P
                  </Text>
                </td>
                <td style={{ paddingLeft: "8px" }}>
                  <Text
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      margin: "0",
                      color: "#18181B",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Polso
                  </Text>
                </td>
              </tr>
            </table>

            <Hr style={{ borderColor: "#e4e4e7", borderWidth: "1px", margin: "24px 0" }} />

            {children}

            <Hr style={{ borderColor: "#e4e4e7", borderWidth: "1px", margin: "32px 0 24px 0" }} />

            {/* Footer */}
            <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Polso
            </Text>
            <Text style={{ fontSize: "12px", color: "#71717A", margin: 0 }}>
              <Link
                href="https://polso.app/privacy"
                style={{ color: "#71717A", textDecoration: "underline" }}
              >
                Privacy
              </Link>
              <span style={{ color: "#d4d4d8", margin: "0 8px" }}>·</span>
              <Link
                href="https://polso.app/terms"
                style={{ color: "#71717A", textDecoration: "underline" }}
              >
                Terms
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
