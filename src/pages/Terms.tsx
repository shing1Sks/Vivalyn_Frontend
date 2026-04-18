import LegalPageWrapper from '../components/ui/LegalPageWrapper'

export default function Terms() {
  return (
    <LegalPageWrapper title="Terms of Service" lastUpdated="April 2026">

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          By creating an account or using Vivalyn ("Service", "we", "us"), you confirm you are at least 18 years of age and have the authority to agree to these Terms on behalf of yourself or your organization. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">2. The Service</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Vivalyn provides AI agent tools — including assessments, training simulations, and general-purpose AI conversations — primarily designed for organizational use but available to individuals.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Accounts</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You must provide accurate and complete information when registering. You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">You agree not to:</p>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li>Use the Service for any unlawful purpose or in violation of applicable laws</li>
          <li>Resell, redistribute, or sublicense the Service without written permission from Vivalyn</li>
          <li>Attempt to reverse-engineer, decompile, or extract source code from the platform</li>
          <li>Generate, distribute, or store harmful, illegal, or fraudulent content through the Service</li>
          <li>Impersonate any person or entity or misrepresent your affiliation</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Subscriptions & Billing</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Access to the Service requires a paid subscription or trial plan. Subscriptions are billed on a monthly basis. Prices may change with reasonable advance notice. All fees are exclusive of applicable taxes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Trial Plans</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Trial access is available either through a scheduled demo meeting or by purchasing a trial subscription at the listed rate. Trial plans provide limited access to evaluate the Service and are subject to the same terms as paid subscriptions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Cancellation</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You may cancel your subscription at any time from your account settings or by contacting us. Upon cancellation, you retain full access until the end of your current billing period. After that, your ability to create and use agents will be suspended. Your data remains on the platform. Either party may terminate your account for material breach of these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Vivalyn retains all rights to the platform, software, and underlying technology. Content you create or upload through the Service remains yours. You grant Vivalyn a limited, non-exclusive license to process and store that content solely to operate and improve the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Privacy</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Your use of the Service is subject to our <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>, which is incorporated into these Terms by reference.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Disclaimers</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          The Service is provided "as is" without warranties of any kind, express or implied. Vivalyn does not guarantee uninterrupted, error-free, or completely secure operation of the Service. AI-generated content is provided for informational and operational purposes and may not always be accurate.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Limitation of Liability</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          To the maximum extent permitted by applicable law, Vivalyn shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if advised of the possibility of such damages.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Governing Law</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          These Terms are governed by the laws of India. Any disputes arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of courts in Varanasi, Uttar Pradesh, India.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We may update these Terms from time to time. We will notify you of material changes via email or through the Service. Continued use of the Service after changes take effect constitutes your acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">14. Contact</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          For questions about these Terms, contact us at{' '}
          <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">support@vivalyn.in</a>.
        </p>
      </section>

    </LegalPageWrapper>
  )
}
