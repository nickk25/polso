import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Polso",
  description: "Terms of Service for Polso financial management platform",
};

export default function TermsOfServicePage() {
  return (
    <article className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: January 30, 2025
          </p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">1. Agreement to Terms</h2>
            <p className="mt-4 text-muted-foreground">
              By accessing or using Polso (&quot;the Service&quot;), you agree
              to be bound by these Terms of Service. If you disagree with any
              part of these terms, you do not have permission to access the
              Service.
            </p>
            <p className="mt-4 text-muted-foreground">
              These Terms apply to all visitors, users, and others who access or
              use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Description of Service</h2>
            <p className="mt-4 text-muted-foreground">
              Polso is a financial management platform that allows you to
              connect your bank accounts, view and categorize transactions,
              track expenses and income, monitor financial metrics, and export
              data for accounting purposes.
            </p>
            <p className="mt-4 text-muted-foreground">
              The Service uses third-party providers, including Plaid for bank
              connections, to deliver its functionality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              3. Subscriptions and Billing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Some parts of the Service are billed on a subscription basis. You
              will be billed in advance on a recurring monthly cycle.
              Subscription fees are non-refundable except as required by law or
              as explicitly stated in these Terms.
            </p>
            <p className="mt-4 text-muted-foreground">
              Your subscription will automatically renew unless you cancel it
              before the end of the current billing period. You can cancel your
              subscription through your account settings or by contacting
              customer support.
            </p>
            <p className="mt-4 text-muted-foreground">
              We reserve the right to modify subscription fees at any time. Any
              fee changes will take effect at the end of your current billing
              cycle. We will provide you with reasonable notice of any pricing
              changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Free Trial</h2>
            <p className="mt-4 text-muted-foreground">
              We may offer a free trial period for new users. At the end of the
              trial, you must select a paid subscription plan to continue using
              the Service. If you do not subscribe, your access will be
              suspended, but your data will be retained for 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Accounts</h2>
            <p className="mt-4 text-muted-foreground">
              When you create an account, you must provide accurate, complete,
              and current information. Failure to do so constitutes a breach of
              these Terms.
            </p>
            <p className="mt-4 text-muted-foreground">
              You are responsible for safeguarding the password used to access
              the Service and for any activities or actions under your password.
              You must notify us immediately upon becoming aware of any breach
              of security or unauthorized use of your account.
            </p>
            <p className="mt-4 text-muted-foreground">
              You may not use as a username the name of another person or entity
              that is not lawfully available for use, or a name that is
              otherwise offensive, vulgar, or obscene.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. User Content</h2>
            <p className="mt-4 text-muted-foreground">
              You retain ownership of any content you submit, post, or display
              on or through the Service, including invoices, receipts, and
              custom categories. By posting content, you grant us a license to
              use, store, and process that content solely to provide the Service
              to you.
            </p>
            <p className="mt-4 text-muted-foreground">
              You are solely responsible for the content you upload and must
              ensure you have the right to share it and that it does not violate
              any laws or third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Financial Disclaimer</h2>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">
                Polso is not a financial advisor, accountant, or tax
                professional.
              </strong>{" "}
              The Service provides tools for organizing and visualizing your
              financial data, but does not provide financial, investment, tax,
              or legal advice.
            </p>
            <p className="mt-4 text-muted-foreground">
              Any financial metrics displayed (such as burn rate, runway, or
              cash flow) are calculations based on your transaction data and
              should not be relied upon as the sole basis for financial
              decisions. We strongly recommend consulting with qualified
              professionals for financial, tax, and legal matters.
            </p>
            <p className="mt-4 text-muted-foreground">
              <strong className="text-foreground">
                We accept no liability for any consequences, losses, or
                penalties resulting from your use of the Service for financial
                or tax purposes.
              </strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Data Accuracy</h2>
            <p className="mt-4 text-muted-foreground">
              Financial data displayed in the Service is sourced from your
              connected bank accounts via third-party providers. While we strive
              to present accurate information, we do not guarantee the accuracy,
              completeness, or timeliness of this data.
            </p>
            <p className="mt-4 text-muted-foreground">
              You are responsible for verifying the accuracy of your financial
              data before making any decisions or sharing it with third parties
              such as accountants.
            </p>
            <p className="mt-4 text-muted-foreground">
              The auto-categorization feature uses rule-based algorithms to
              suggest expense categories. These suggestions may not always be
              accurate and should be reviewed by you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">9. Exports and Reports</h2>
            <p className="mt-4 text-muted-foreground">
              The Service allows you to export transaction data and generate
              reports. You are solely responsible for the accuracy, legality,
              and compliance of any exported data or reports with applicable
              local regulations.
            </p>
            <p className="mt-4 text-muted-foreground">
              We act as a technical facilitator for organizing and exporting
              your data. We do not verify, audit, or guarantee the correctness
              of exported information for accounting, tax, or legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">10. Prohibited Uses</h2>
            <p className="mt-4 text-muted-foreground">
              You agree not to use the Service:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>For any unlawful purpose or to violate any laws</li>
              <li>
                To infringe upon or violate our intellectual property rights or
                those of others
              </li>
              <li>To transmit any malicious code, viruses, or harmful data</li>
              <li>
                To attempt to gain unauthorized access to any part of the
                Service
              </li>
              <li>To interfere with or disrupt the Service or servers</li>
              <li>To impersonate another person or entity</li>
              <li>To collect or track personal information of other users</li>
              <li>For any fraudulent or deceptive purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">11. Intellectual Property</h2>
            <p className="mt-4 text-muted-foreground">
              The Service and its original content (excluding user content),
              features, and functionality are and will remain the exclusive
              property of Polso. The Service is protected by copyright,
              trademark, and other laws.
            </p>
            <p className="mt-4 text-muted-foreground">
              Our trademarks and trade dress may not be used in connection with
              any product or service without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">12. Third-Party Links</h2>
            <p className="mt-4 text-muted-foreground">
              The Service may contain links to third-party websites or services
              that are not owned or controlled by us. We have no control over,
              and assume no responsibility for, the content, privacy policies,
              or practices of any third-party websites or services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">13. Termination</h2>
            <p className="mt-4 text-muted-foreground">
              We may terminate or suspend your account immediately, without
              prior notice or liability, for any reason, including if you breach
              these Terms.
            </p>
            <p className="mt-4 text-muted-foreground">
              Upon termination, your right to use the Service will immediately
              cease. If you wish to terminate your account, you may do so by
              contacting us or through your account settings.
            </p>
            <p className="mt-4 text-muted-foreground">
              Following termination, we will retain your data for 30 days,
              during which you may request an export of your data. After this
              period, your data will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">
              14. Limitation of Liability
            </h2>
            <p className="mt-4 text-muted-foreground">
              To the maximum extent permitted by law, Polso and its affiliates,
              officers, employees, agents, partners, and suppliers shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including without limitation, loss of profits,
              data, use, goodwill, or other intangible losses, resulting from:
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>
                Your access to or use of (or inability to access or use) the
                Service
              </li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>
                Unauthorized access, use, or alteration of your transmissions or
                content
              </li>
              <li>
                Errors, inaccuracies, or omissions in financial data or
                calculations
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">15. Disclaimer</h2>
            <p className="mt-4 text-muted-foreground">
              The Service is provided on an &quot;AS IS&quot; and &quot;AS
              AVAILABLE&quot; basis, without any warranties of any kind, either
              express or implied, including but not limited to implied
              warranties of merchantability, fitness for a particular purpose,
              non-infringement, or course of performance.
            </p>
            <p className="mt-4 text-muted-foreground">
              We do not warrant that the Service will function uninterrupted,
              secure, or available at any particular time or location, that any
              errors or defects will be corrected, or that the Service is free
              of viruses or other harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">16. Governing Law</h2>
            <p className="mt-4 text-muted-foreground">
              These Terms shall be governed by and construed in accordance with
              the laws of the European Union and applicable local laws, without
              regard to its conflict of law provisions.
            </p>
            <p className="mt-4 text-muted-foreground">
              Any disputes arising from these Terms or the Service shall be
              resolved through the courts of competent jurisdiction in the
              European Union.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">17. Changes to Terms</h2>
            <p className="mt-4 text-muted-foreground">
              We reserve the right to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days&apos;
              notice prior to any new terms taking effect.
            </p>
            <p className="mt-4 text-muted-foreground">
              By continuing to access or use the Service after revisions become
              effective, you agree to be bound by the revised terms. If you do
              not agree to the new terms, please stop using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">18. Contact Us</h2>
            <p className="mt-4 text-muted-foreground">
              If you have any questions about these Terms, please contact us:
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
