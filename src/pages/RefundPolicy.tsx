import LegalPageWrapper from '../components/ui/LegalPageWrapper'

export default function RefundPolicy() {
  return (
    <LegalPageWrapper title="Cancellation & Refund Policy" lastUpdated="April 2026">

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Billing</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Vivalyn subscriptions are billed monthly in advance. Annual plans will be available in the future. All charges are processed securely by Razorpay / Stripe.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">How to Cancel</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You may cancel your subscription at any time from your account settings or by emailing{' '}
          <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">support@vivalyn.in</a>.
          No cancellation fees apply.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">What Happens After You Cancel</h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
          <li>You retain full access to the Service for the remainder of your current billing period</li>
          <li>Your subscription will not renew and you will not be charged again</li>
          <li>Once the billing period ends, agent creation and usage will be suspended</li>
          <li>Your data remains on the platform and accessible after cancellation</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Refund Policy</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          All payments are final. We do not offer refunds for subscription fees, partial months, or unused portions of a billing period.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Because AI agent usage incurs real infrastructure and API costs from the moment a subscription is activated, we are unable to issue refunds once a billing period has started.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Trial Plans</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Trial access is available through a scheduled demo meeting or by purchasing a trial subscription at the listed rate. Trial subscriptions are subject to the same no-refund policy as standard subscriptions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Charged in Error or Disputes</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          If you believe you were charged in error, contact us at{' '}
          <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">support@vivalyn.in</a>{' '}
          within 7 days of the charge and we will investigate promptly.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Please reach out to us before initiating a chargeback with your bank or card provider. We resolve billing issues directly and quickly.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          <a href="mailto:support@vivalyn.in" className="text-indigo-600 hover:underline">support@vivalyn.in</a>
          {' '}— we aim to respond within 48 hours.
        </p>
      </section>

    </LegalPageWrapper>
  )
}
