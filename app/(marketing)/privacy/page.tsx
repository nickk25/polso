import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Polso",
  description: "Privacy Policy for Polso financial management platform",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: January 30, 2025
          </p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">Introduction</h2>
            <p className="mt-4 text-muted-foreground">
              Polso (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;)
              operates the Polso financial management platform. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your
              information when you use our Service.
            </p>
            <p className="mt-4 text-muted-foreground">
              We are committed to protecting your privacy and ensuring the
              security of your financial data. Please read this Privacy Policy
              carefully. By using the Service, you agree to the collection and
              use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Definitions</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              <li>
                <strong className="text-foreground">Service</strong> refers to
                the Polso platform, accessible via web browser.
              </li>
              <li>
                <strong className="text-foreground">Personal Data</strong> means
                data that identifies or can identify an individual.
              </li>
              <li>
                <strong className="text-foreground">Usage Data</strong> refers
                to data collected automatically through the Service.
              </li>
              <li>
                <strong className="text-foreground">Financial Data</strong>{" "}
                means bank account information, transaction data, and related
                financial information.
              </li>
              <li>
                <strong className="text-foreground">Data Controller</strong>{" "}
                refers to Polso as the entity determining the purposes and means
                of processing Personal Data.
              </li>
              <li>
                <strong className="text-foreground">Data Processor</strong>{" "}
                refers to any party that processes data on behalf of the Data
                Controller.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Information We Collect</h2>
            <p className="mt-4 text-muted-foreground">
              We collect several types of information for various purposes to
              provide and improve our Service:
            </p>

            <h3 className="mt-6 text-sm font-semibold">Personal Data</h3>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>Email address</li>
              <li>Name</li>
              <li>Organization name</li>
              <li>Usage data and preferences</li>
            </ul>

            <h3 className="mt-6 text-sm font-semibold">
              Financial Data (via Plaid)
            </h3>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>Bank account names and balances</li>
              <li>
                Transaction history (merchant name, amount, date, category)
              </li>
              <li>Account type and institution information</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">Important:</strong> We never
              see or store your bank login credentials. All bank authentication
              is handled securely by Plaid, our Open Banking provider.
            </p>

            <h3 className="mt-6 text-sm font-semibold">Usage Data</h3>
            <p className="mt-2 text-muted-foreground">
              We automatically collect information about how you access and use
              the Service, including your IP address, browser type, pages
              visited, time spent, and other diagnostic data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              How We Use Your Information
            </h2>
            <p className="mt-4 text-muted-foreground">
              We use the collected data for the following purposes:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>To provide, maintain, and improve the Service</li>
              <li>To sync and categorize your financial transactions</li>
              <li>
                To detect recurring expenses and calculate financial metrics
              </li>
              <li>To generate reports and exports for your accountant</li>
              <li>To notify you about changes to our Service</li>
              <li>To provide customer support</li>
              <li>To monitor usage and detect technical issues</li>
              <li>To send you marketing communications (with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Third-Party Services</h2>
            <p className="mt-4 text-muted-foreground">
              We use the following third-party services to operate Polso:
            </p>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              <li>
                <strong className="text-foreground">Plaid</strong> — For secure
                bank connections via Open Banking. Plaid&apos;s privacy policy
                is available at plaid.com/legal.
              </li>
              <li>
                <strong className="text-foreground">Neon</strong> — For database
                hosting and authentication services.
              </li>
              <li>
                <strong className="text-foreground">Cloudflare</strong> — For
                file storage (invoices and exports).
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> — For
                application hosting.
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Each of these services has their own Privacy Policy governing
              their use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Data Security</h2>
            <p className="mt-4 text-muted-foreground">
              The security of your data is important to us. We implement
              appropriate technical and organizational measures to protect your
              Personal Data and Financial Data, including:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>Encryption of data in transit (TLS) and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments</li>
              <li>Access controls and audit logging</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              However, no method of transmission over the Internet or method of
              electronic storage is 100% secure. While we strive to use
              commercially acceptable means to protect your data, we cannot
              guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Data Retention</h2>
            <p className="mt-4 text-muted-foreground">
              We retain your Personal Data and Financial Data for as long as
              your account is active or as needed to provide you with the
              Service. We will also retain and use your data as necessary to
              comply with legal obligations, resolve disputes, and enforce our
              agreements.
            </p>
            <p className="mt-4 text-muted-foreground">
              If you delete your account, we will delete your data within 30
              days, except where we are required to retain it for legal or
              regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Your Rights (GDPR)</h2>
            <p className="mt-4 text-muted-foreground">
              If you are a resident of the European Economic Area (EEA), you
              have certain data protection rights:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Access</strong> — You can
                request copies of your personal data.
              </li>
              <li>
                <strong className="text-foreground">Rectification</strong> — You
                can request correction of inaccurate data.
              </li>
              <li>
                <strong className="text-foreground">Erasure</strong> — You can
                request deletion of your personal data.
              </li>
              <li>
                <strong className="text-foreground">Restriction</strong> — You
                can request restriction of processing.
              </li>
              <li>
                <strong className="text-foreground">Portability</strong> — You
                can request transfer of your data.
              </li>
              <li>
                <strong className="text-foreground">Objection</strong> — You can
                object to processing of your data.
              </li>
              <li>
                <strong className="text-foreground">Withdraw Consent</strong> —
                You can withdraw consent at any time.
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              To exercise any of these rights, please contact us at
              privacy@polso.app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Cookies</h2>
            <p className="mt-4 text-muted-foreground">
              We use cookies and similar tracking technologies to track activity
              on our Service and hold certain information. Cookies are small
              data files stored on your device. You can instruct your browser to
              refuse all cookies or to indicate when a cookie is being sent.
            </p>
            <p className="mt-4 text-muted-foreground">
              We use essential cookies for authentication and session
              management, and analytics cookies to understand how you use our
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Children&apos;s Privacy</h2>
            <p className="mt-4 text-muted-foreground">
              Our Service is not intended for use by children under the age of
              18. We do not knowingly collect personally identifiable
              information from anyone under 18. If you are a parent or guardian
              and you are aware that your child has provided us with Personal
              Data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Changes to This Policy</h2>
            <p className="mt-4 text-muted-foreground">
              We may update our Privacy Policy from time to time. We will notify
              you of any changes by posting the new Privacy Policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
            <p className="mt-4 text-muted-foreground">
              You are advised to review this Privacy Policy periodically for any
              changes. Changes are effective when they are posted on this page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have any questions about this Privacy Policy, please
              contact us:
            </p>
            <p className="mt-4 text-muted-foreground">
              Email:{" "}
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
