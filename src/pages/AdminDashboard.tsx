import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminMe } from '../lib/api'
import { AdminAnalyticsView } from '../components/admin/AdminAnalyticsView'
import { AdminHomeView } from '../components/admin/AdminHomeView'
import { RunDetailPanel } from '../components/admin/RunDetailPanel'
import { AdminInquiriesView } from '../components/admin/AdminInquiriesView'
import { AdminSubscriptionsView } from '../components/admin/AdminSubscriptionsView'
import { AdminDiscountsView } from '../components/admin/AdminDiscountsView'
import { AdminRetentionView } from '../components/admin/AdminRetentionView'
import AdminSidebar, { type AdminSection } from '../components/admin/AdminSidebar'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'

function NotAuthorized({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your account is not authorised to access the admin dashboard. Contact the system administrator if you believe this is an error.
        </p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 mx-auto text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agent Space
        </button>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { session, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()

  // Auth guard
  const [adminVerified, setAdminVerified] = useState(false)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)

  // Section nav
  const [activeSection, setActiveSection] = useState<AdminSection>('home')
  const [mounted, setMounted] = useState<Record<AdminSection, boolean>>({
    home: true,
    analytics: false,
    inquiries: false,
    subscriptions: false,
    discounts: false,
    retention: false,
  })

  // Run detail overlay
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // Pending action: open activate modal in subscriptions
  const [pendingActivateModal, setPendingActivateModal] = useState(false)
  // Ref to reset flag after consumption
  const activateModalConsumedRef = useRef(false)

  // Verify admin on mount
  useEffect(() => {
    if (authLoading) return
    if (!session) {
      navigate('/agent-space')
      return
    }
    adminMe(session.access_token)
      .then(() => {
        setAdminVerified(true)
        setAuthChecking(false)
      })
      .catch(() => {
        setNotAuthorized(true)
        setAuthChecking(false)
      })
  }, [authLoading, session, navigate])

  function navigateTo(section: AdminSection) {
    setActiveSection(section)
    setMounted((m) => ({ ...m, [section]: true }))
  }

  function handleActivateSubscription() {
    activateModalConsumedRef.current = false
    setPendingActivateModal(true)
    navigateTo('subscriptions')
  }

  function handleActivateModalConsumed() {
    setPendingActivateModal(false)
  }

  if (authLoading || authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  if (notAuthorized) {
    return <NotAuthorized onBack={() => navigate('/agent-space')} />
  }

  if (!adminVerified) return null

  const token = session!.access_token

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onNavigate={navigateTo}
        onSignOut={signOut}
      />

      {/* Main content — offset by sidebar width */}
      <div className="ml-55 flex-1 overflow-y-auto">
        {/* Home */}
        <div className={activeSection !== 'home' ? 'hidden' : ''}>
          {mounted.home && (
            <AdminHomeView
              token={token}
              onNavigate={navigateTo}
              onActivateSubscription={handleActivateSubscription}
            />
          )}
        </div>

        {/* Analytics */}
        <div className={activeSection !== 'analytics' ? 'hidden' : ''}>
          {mounted.analytics && (
            <AdminAnalyticsView
              token={token}
              onSelectRun={setSelectedRunId}
            />
          )}
        </div>

        {/* Inquiries */}
        <div className={activeSection !== 'inquiries' ? 'hidden' : ''}>
          {mounted.inquiries && <AdminInquiriesView token={token} />}
        </div>

        {/* Subscriptions */}
        <div className={activeSection !== 'subscriptions' ? 'hidden' : ''}>
          {mounted.subscriptions && (
            <AdminSubscriptionsView
              token={token}
              openActivateModal={pendingActivateModal}
              onActivateModalConsumed={handleActivateModalConsumed}
            />
          )}
        </div>

        {/* Retention */}
        <div className={activeSection !== 'retention' ? 'hidden' : ''}>
          {mounted.retention && <AdminRetentionView token={token} />}
        </div>

        {/* Discounts */}
        <div className={activeSection !== 'discounts' ? 'hidden' : ''}>
          {mounted.discounts && <AdminDiscountsView token={token} />}
        </div>
      </div>

      {/* Run detail overlay — global, rendered at dashboard level */}
      <RunDetailPanel
        token={token}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </div>
  )
}
