import LegalPageWrapper from '../components/ui/LegalPageWrapper'

export default function Privacy() {
  return (
    <LegalPageWrapper title="Privacy Policy" lastUpdated="April 2026">

      <p className="text-sm text-gray-600 leading-relaxed">
        Vivalyn is operated from Varanasi, India. This policy explains how we collect, use, and handle your information when you use our platform ("Service").
      </p>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">1. What We Collect</h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li><span className="font-medium text-gray-700">Account information:</span> your name, email address, and organization name on registration</li>
          <li><span className="font-medium text-gray-700">Usage data:</span> agent session logs, evaluation records, and platform interactions</li>
          <li><span className="font-medium text-gray-700">Support correspondence:</span> records of messages you send us</li>
          <li><span className="font-medium text-gray-700">Payment information:</span> processed entirely by Stripe — we never store full card details</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use It</h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li>To provide, operate, and maintain the Service</li>
          <li>To authenticate you and manage your account</li>
          <li>To generate evaluation reports and session summaries</li>
          <li>For debugging, reliability monitoring, and internal analysis</li>
          <li>Anonymized interaction data may be used to improve our AI systems and for potential future fine-tuning of internal models</li>
          <li>To send transactional emails such as account notices, invites, and payment receipts</li>
          <li>Occasionally, to send minimal product updates or offers — you can opt out at any time</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Who We Share With</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">We do not sell your personal data. We share data only with the following service providers:</p>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li><span className="font-medium text-gray-700">Supabase</span> — authentication and database infrastructure</li>
          <li><span className="font-medium text-gray-700">Stripe</span> — payment processing</li>
          <li><span className="font-medium text-gray-700">Resend</span> — transactional email delivery</li>
          <li><span className="font-medium text-gray-700">AI model providers</span> — session content is sent to third-party LLM APIs to run agent interactions</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data Retention</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          When you delete your account, most of your personal data is removed immediately. We may retain agent records and interaction logs for debugging, internal analysis, and future model improvement. We also retain records required for legal or financial compliance. We do not retain payment card data at any time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Users and End Users</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Vivalyn accounts — including anyone who creates or administers agents — are restricted to users 18 years of age or older. Agents built on Vivalyn may interact with end users of any age. Organizations deploying agents are responsible for ensuring appropriate use with their audiences.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Cookies</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We use only essential cookies necessary for authentication and session management. We do not use analytics trackers, advertising cookies, or any third-party tracking technology.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Security</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We use HTTPS and secure cloud infrastructure to protect your data. No system is completely secure, and we cannot guarantee absolute security. We will notify you promptly if we become aware of a breach affecting your data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Your Rights</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">You may:</p>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li>Request access to or an export of the data we hold about you</li>
          <li>Request deletion of your account and associated personal data</li>
          <li>Opt out of marketing communications at any time</li>
        </ul>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">support@vivalyn.in</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We may update this Privacy Policy from time to time. Continued use of the Service after changes take effect constitutes your acceptance of the updated policy. Material changes will be communicated via email or through the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Vivalyn, Varanasi, Uttar Pradesh, India
          <br />
          <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">support@vivalyn.in</a>
        </p>
      </section>

    </LegalPageWrapper>
  )
}
