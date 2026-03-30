export const metadata = {
  title: "End-User License Agreement | TaxEngine",
};

export default function EULAPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-stone-800">
      <h1 className="text-2xl font-semibold mb-2">End-User License Agreement</h1>
      <p className="text-sm text-stone-500 mb-8">Last updated: March 29, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="font-semibold mb-1">1. Acceptance of Terms</h2>
          <p>
            By accessing or using TaxEngine ("the Service"), you agree to be bound by this End-User
            License Agreement ("EULA"). If you do not agree, do not use the Service.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">2. License Grant</h2>
          <p>
            TaxEngine grants you a limited, non-exclusive, non-transferable, revocable license to
            use the Service solely for your internal business tax preparation purposes.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">3. QuickBooks Online Integration</h2>
          <p>
            The Service connects to QuickBooks Online ("QBO") via Intuit's OAuth 2.0 API to read
            your chart of accounts and journal entries for tax analysis. You authorize TaxEngine to
            access your QBO data solely for the purpose of generating tax diagnostics and form
            requirements. We do not modify, delete, or write any data to your QBO account.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">4. Data Use</h2>
          <p>
            Financial data retrieved from QBO is processed and stored in a secure database to
            generate tax reports. Your data is not sold to third parties and is not used for any
            purpose other than providing the Service.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">5. Restrictions</h2>
          <p>You may not:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Reverse engineer, decompile, or disassemble the Service</li>
            <li>Use the Service for illegal tax evasion or fraud</li>
            <li>Share your account credentials with unauthorized parties</li>
            <li>Use the Service in a manner that violates Intuit's developer policies</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold mb-1">6. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is." TaxEngine makes no warranties, express or implied,
            regarding accuracy of tax determinations. All output should be reviewed by a qualified
            tax professional before filing. Tax law changes frequently — always verify current IRS
            requirements.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, TaxEngine shall not be liable for any indirect,
            incidental, or consequential damages arising from use of the Service, including any tax
            penalties or interest resulting from reliance on our output.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">8. Termination</h2>
          <p>
            You may disconnect your QBO account at any time using the Disconnect button in the
            application. Upon termination, your access tokens are revoked and no further data is
            fetched from QBO.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">9. Governing Law</h2>
          <p>
            This EULA is governed by the laws of the United States. Any disputes shall be resolved
            in the applicable federal or state courts.
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-1">10. Contact</h2>
          <p>
            For questions about this EULA, contact us at{" "}
            <a href="mailto:legal@taxengine.app" className="text-blue-600 underline">
              legal@taxengine.app
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
