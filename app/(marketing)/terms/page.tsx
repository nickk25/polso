import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Terms of Service — Polso",
  description: "Terms of Service for Polso financial management platform",
};

export default async function TermsOfServicePage() {
  const t = await getTranslations("legal");

  return (
    <article className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("label")}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("terms.title")}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("terms.lastUpdated")}
          </p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">{t("terms.s1Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s1P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s1P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s2Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s2P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s2P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              {t("terms.s3Title")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s3P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s3P2")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s3P3")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s4Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s4P1")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s5Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s5P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s5P2")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s5P3")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s6Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s6P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s6P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s7Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">
                {t("terms.s7Bold1")}
              </strong>{" "}
              {t("terms.s7P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s7P2")}
            </p>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">
                {t("terms.s7Bold2")}
              </strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s8Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s8P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s8P2")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s8P3")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s9Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s9P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s9P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s10Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s10Intro")}
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {(t.raw("terms.s10Items") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s11Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s11P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s11P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s12Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s12P1")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s13Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s13P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s13P2")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s13P3")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              {t("terms.s14Title")}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s14Intro")}
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              {(t.raw("terms.s14Items") as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s15Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s15P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s15P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s16Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s16P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s16P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s17Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s17P1")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s17P2")}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t("terms.s18Title")}</h2>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s18Intro")}
            </p>
            <p className="mt-4 text-muted-foreground">
              {t("terms.s18Email")}{" "}
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
