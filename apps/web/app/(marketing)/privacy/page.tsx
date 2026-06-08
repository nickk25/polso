import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Privacy Policy — Polso",
  description: "Privacy Policy for Polso financial management platform",
};

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal");

  return (
    <article className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("label")}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("privacy.title")}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("privacy.lastUpdated")}
          </p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">{t("privacy.introTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.introP1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.introP2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.definitionsTitle")}</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              <li>
                <strong className="text-foreground">{t("privacy.defService")}</strong>{" "}
                {t("privacy.defServiceDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.defPersonalData")}</strong>{" "}
                {t("privacy.defPersonalDataDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.defUsageData")}</strong>{" "}
                {t("privacy.defUsageDataDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.defFinancialData")}</strong>{" "}
                {t("privacy.defFinancialDataDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.defDataController")}</strong>{" "}
                {t("privacy.defDataControllerDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.defDataProcessor")}</strong>{" "}
                {t("privacy.defDataProcessorDesc")}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.collectTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.collectIntro")}
            </p>

            <h3 className="mt-6 text-sm font-semibold">{t("privacy.personalDataTitle")}</h3>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {(t.raw("privacy.personalDataItems") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>

            <h3 className="mt-6 text-sm font-semibold">
              {t("privacy.financialDataTitle")}
            </h3>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {(t.raw("privacy.financialDataItems") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">{t("privacy.financialDataImportant")}</strong>{" "}
              {t("privacy.financialDataNote")}
            </p>

            <h3 className="mt-6 text-sm font-semibold">{t("privacy.usageDataTitle")}</h3>
            <p className="mt-2 text-muted-foreground">
              {t("privacy.usageDataDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              {t("privacy.useTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.useIntro")}
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {(t.raw("privacy.useItems") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.thirdPartyTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.thirdPartyIntro")}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-muted-foreground">
                <thead>
                  <tr className="border-b text-left text-foreground">
                    <th className="pb-2 pr-4 font-medium">{t("privacy.thirdPartyTableService")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("privacy.thirdPartyTablePurpose")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("privacy.thirdPartyTableData")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("privacy.thirdPartyTableCountry")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("privacy.thirdPartyTableTransfer")}</th>
                    <th className="pb-2 font-medium">{t("privacy.thirdPartyTablePolicy")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(t.raw("privacy.thirdPartyProcessors") as Array<{name: string; purpose: string; data: string; country: string; transfer: string; policy: string}>).map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">{p.name}</td>
                      <td className="py-2 pr-4">{p.purpose}</td>
                      <td className="py-2 pr-4">{p.data}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{p.country}</td>
                      <td className="py-2 pr-4">{p.transfer}</td>
                      <td className="py-2">
                        <a href={p.policy} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                          {t("privacy.thirdPartyTablePolicy")}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.thirdPartyNote")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.automatedTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.automatedIntro")}
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {(t.raw("privacy.automatedItems") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.automatedContact")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.supervisoryTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.supervisoryDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.securityTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.securityIntro")}
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {(t.raw("privacy.securityItems") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.securityNote")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.retentionTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.retentionP1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.retentionP2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.gdprTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.gdprIntro")}
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">{t("privacy.gdprAccess")}</strong> —{" "}
                {t("privacy.gdprAccessDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.gdprRectification")}</strong> —{" "}
                {t("privacy.gdprRectificationDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.gdprErasure")}</strong> —{" "}
                {t("privacy.gdprErasureDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.gdprRestriction")}</strong> —{" "}
                {t("privacy.gdprRestrictionDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.gdprPortability")}</strong> —{" "}
                {t("privacy.gdprPortabilityDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.gdprObjection")}</strong> —{" "}
                {t("privacy.gdprObjectionDesc")}
              </li>
              <li>
                <strong className="text-foreground">{t("privacy.gdprWithdraw")}</strong> —{" "}
                {t("privacy.gdprWithdrawDesc")}
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.gdprContact")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.cookiesTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.cookiesP1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.cookiesP2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.childrenTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.childrenDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.changesTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.changesP1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.changesP2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("privacy.contactTitle")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.contactIntro")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("privacy.contactEmail")}{" "}
              <a
                href="mailto:support@polso.app"
                className="text-primary hover:underline"
              >
                support@polso.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
