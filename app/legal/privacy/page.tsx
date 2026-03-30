export const metadata = {
  title: "Privacy Policy | TaxEngine",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-stone-800">
      <h1 className="text-2xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-sm text-stone-500 mb-8">Last updated: March 29, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="font-semibold mb-1">1. Overview</h2>
          <p>
            TaxEngine ("we," "our," or "us") provides a tax preparation analysis tool that connects
            to QuickBooks Online. This Privacy Policy explains what data we collect, how we use it,
            and your rights.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">2. Data We Collect</h2>
          <p>When you connect your QuickBooks Online account, we retrieve:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Company name (from QBO CompanyInfo API)</li>
            <li>Chart of accounts (account names, types, and subtypes)</li>
            <li>Journal entries (dates, amounts, account references) for the selected tax year</li>
            <li>OAuth access and refresh tokens (stored securely on the server)</li>
          </ul>
          <p className="mt-2">We do not collect personal identifying information about individuals within your company.</p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">3. How We Use Your Data</h2>
          <p>Your QBO data is used exclusively to:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Build a trial balance for the selected tax year</li>
            <li>Map accounts to IRS tax categories</li>
            <li>Determine which tax forms your entity is required to file</li>
            <li>Generate tax diagnostic warnings and review notes</li>
          </ul>
          <p className="mt-2">
            We do not use your financial data for advertising, benchmarking, or any purpose other
            than providing the Service.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">4. Data Storage</h2>
          <p>
            Processed data (trial balance lines, tax mappings, facts, diagnostics, and form
            requirements) is stored in a secure database with row-level isolation. OAuth tokens
            are encrypted and stored server-side. Tokens are cleared when you disconnect your
            QBO account.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">5. Data Sharing</h2>
          <p>
            We do not sell, rent, or share your financial data with any third parties. We use
            Supabase as a managed database provider; their privacy policy applies to data stored on
            their infrastructure.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">6. Intuit / QuickBooks Online</h2>
          <p>
            Our use of QBO data is governed by Intuit's developer policies. We only request
            read-only access to your accounting data. We never write to or modify your QBO books.
            You can revoke our access at any time from within QBO or by clicking Disconnect in the
            TaxEngine application.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">7. Data Retention</h2>
          <p>
            Tax analysis data is retained for the current tax year session. You may request
            deletion of your data by contacting us. Upon disconnecting QBO, your OAuth tokens are
            immediately revoked.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">8. Security</h2>
          <p>
            We use HTTPS for all data in transit, server-side environment variables for API keys,
            and Supabase service-role authentication for database access. We never expose your
            OAuth tokens to the browser.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">9. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Access the data we hold about your entity</li>
            <li>Request deletion of your data</li>
            <li>Disconnect your QBO account at any time</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold mb-1">10. Changes to This Policy</h2>
          <p>
            We may update this policy as the Service evolves. We will update the "Last updated"
            date at the top when changes are made.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">11. Contact</h2>
          <p>
            For privacy questions or data deletion requests, contact us at{" "}
            <a href="mailto:privacy@taxengine.app" className="text-blue-600 underline">
              privacy@taxengine.app
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
