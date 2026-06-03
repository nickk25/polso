import { Preview, Text, Button, Row, Column, Section } from "@react-email/components"
import { EmailLayout } from "./components/email-layout"
import type { Locale } from "../src/locale"
import { getEmailTranslations } from "../src/email-translations"

interface DigestClient {
  id: string
  name: string
  connectedAt: Date
}

interface DigestClientCount {
  clientId: string
  clientName: string
  count: number
}

interface PartnerDigestEmailProps {
  partnerName: string
  partnerOrgName: string
  cadence: "daily" | "weekly"
  periodLabel: string
  newClients: DigestClient[]
  receiptsUploaded: DigestClientCount[]
  pendingReceipts: DigestClientCount[]
  dashboardUrl: string
  locale?: Locale
}

const cellStyle = { fontSize: "13px", color: "#3f3f46", padding: "6px 0", borderBottom: "1px solid #f4f4f5" }
const headerStyle = { fontSize: "11px", color: "#a1a1aa", padding: "4px 0 6px", textTransform: "uppercase" as const, letterSpacing: "0.08em" }

export default function PartnerDigestEmail({
  partnerName,
  partnerOrgName,
  cadence,
  periodLabel,
  newClients,
  receiptsUploaded,
  pendingReceipts,
  dashboardUrl,
  locale = "es",
}: PartnerDigestEmailProps) {
  const t = getEmailTranslations(locale)
  const isDaily = cadence === "daily"

  const subject = isDaily
    ? t("partnerDigest.subjectDaily", { partnerOrgName })
    : t("partnerDigest.subjectWeekly", { partnerOrgName })

  const heading = isDaily
    ? t("partnerDigest.headingDaily")
    : t("partnerDigest.headingWeekly")

  const hasActivity = newClients.length > 0 || receiptsUploaded.length > 0 || pendingReceipts.length > 0

  return (
    <EmailLayout preview={subject} locale={locale}>
      <Preview>{subject}</Preview>

      <Text style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {isDaily ? t("partnerDigest.badgeDaily") : t("partnerDigest.badgeWeekly")}
      </Text>
      <Text style={{ fontSize: "20px", fontWeight: 600, color: "#18181B", margin: "0 0 24px 0", lineHeight: 1.3 }}>
        {heading}
      </Text>

      {!hasActivity && (
        <Text style={{ fontSize: "14px", color: "#71717a", margin: "0 0 24px 0" }}>
          {t("partnerDigest.noActivity")}
        </Text>
      )}

      {newClients.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("partnerDigest.newClientsTitle")}
          </Text>
          <Row>
            <Column style={headerStyle}>{t("partnerDigest.clientColumn")}</Column>
          </Row>
          {newClients.map((c) => (
            <Row key={c.id}>
              <Column style={cellStyle}>{c.name}</Column>
            </Row>
          ))}
        </Section>
      )}

      {receiptsUploaded.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("partnerDigest.receiptsUploadedTitle", { periodLabel })}
          </Text>
          <Row>
            <Column style={{ ...headerStyle, width: "70%" }}>{t("partnerDigest.clientColumn")}</Column>
            <Column style={{ ...headerStyle, textAlign: "right" as const }}>{t("partnerDigest.countColumn")}</Column>
          </Row>
          {receiptsUploaded.map((r) => (
            <Row key={r.clientId}>
              <Column style={{ ...cellStyle, width: "70%" }}>{r.clientName}</Column>
              <Column style={{ ...cellStyle, textAlign: "right" as const, fontWeight: 600 }}>{r.count}</Column>
            </Row>
          ))}
        </Section>
      )}

      {pendingReceipts.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: "#18181B", margin: "0 0 8px 0" }}>
            {t("partnerDigest.pendingReceiptsTitle")}
          </Text>
          <Row>
            <Column style={{ ...headerStyle, width: "70%" }}>{t("partnerDigest.clientColumn")}</Column>
            <Column style={{ ...headerStyle, textAlign: "right" as const }}>{t("partnerDigest.countColumn")}</Column>
          </Row>
          {pendingReceipts.map((r) => (
            <Row key={r.clientId}>
              <Column style={{ ...cellStyle, width: "70%" }}>{r.clientName}</Column>
              <Column style={{ ...cellStyle, textAlign: "right" as const, fontWeight: 600 }}>{r.count}</Column>
            </Row>
          ))}
        </Section>
      )}

      <Button
        href={dashboardUrl}
        style={{
          backgroundColor: "#18181B",
          color: "#ffffff",
          padding: "12px 20px",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          display: "inline-block",
          textAlign: "center",
        }}
      >
        {t("partnerDigest.button")}
      </Button>

      <Text style={{ fontSize: "12px", color: "#71717A", margin: "24px 0 0 0" }}>
        {t("partnerDigest.footer")}
      </Text>
    </EmailLayout>
  )
}

PartnerDigestEmail.PreviewProps = {
  partnerName: "María García",
  partnerOrgName: "Asesoría Pérez & Asociados",
  cadence: "weekly" as const,
  periodLabel: "esta semana",
  newClients: [
    { id: "1", name: "Talleres Ruiz S.L.", connectedAt: new Date() },
  ],
  receiptsUploaded: [
    { clientId: "1", clientName: "Talleres Ruiz S.L.", count: 3 },
    { clientId: "2", clientName: "Fontanería López", count: 1 },
  ],
  pendingReceipts: [
    { clientId: "2", clientName: "Fontanería López", count: 7 },
  ],
  dashboardUrl: "https://partner.polso.com",
  locale: "es" as const,
} satisfies PartnerDigestEmailProps
