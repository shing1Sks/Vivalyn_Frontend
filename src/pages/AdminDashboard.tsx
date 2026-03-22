import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminMe } from '../lib/api'
import { AdminOverviewView } from '../components/admin/AdminOverviewView'
import { AdminOrgView } from '../components/admin/AdminOrgView'
import { AdminAgentView } from '../components/admin/AdminAgentView'
import { RunDetailPanel } from '../components/admin/RunDetailPanel'
import { ChevronRight, Loader2, LogOut, Lock, ArrowLeft } from 'lucide-react'

type View = 'overview' | 'org' | 'agent'

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from: formatDate(from), to: formatDate(to) }
}

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

  // View state
  const [view, setView] = useState<View>('overview')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState<string>('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [selectedAgentName, setSelectedAgentName] = useState<string>('')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  // Track which views have ever been visited (keep-alive)
  const [mounted, setMounted] = useState({ org: false, agent: false })

  // Filter state
  const initial = defaultDateRange(30)
  const [dateFrom, setDateFrom] = useState(initial.from)
  const [dateTo, setDateTo] = useState(initial.to)
  const [excludeTest, setExcludeTest] = useState(true)
  const [activeDays, setActiveDays] = useState<7 | 30 | 90>(30)

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

  function setQuickRange(days: 7 | 30 | 90) {
    setActiveDays(days)
    const r = defaultDateRange(days)
    setDateFrom(r.from)
    setDateTo(r.to)
  }

  function drillToOrg(orgId: string, orgName: string) {
    setSelectedOrgId(orgId)
    setSelectedOrgName(orgName)
    setSelectedAgentId(null)
    setSelectedAgentName('')
    setMounted((m) => ({ ...m, org: true }))
    setView('org')
  }

  function drillToAgent(agentId: string, agentName: string) {
    setSelectedAgentId(agentId)
    setSelectedAgentName(agentName)
    setMounted((m) => ({ ...m, agent: true }))
    setView('agent')
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
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('overview')}
            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-[120ms]"
          >
            Admin
          </button>
          {view !== 'overview' && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <button
                onClick={() => setView('overview')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
              >
                Overview
              </button>
            </>
          )}
          {(view === 'org' || view === 'agent') && selectedOrgName && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <button
                onClick={() => setView('org')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
              >
                {selectedOrgName}
              </button>
            </>
          )}
          {view === 'agent' && selectedAgentName && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-700 font-medium">{selectedAgentName}</span>
            </>
          )}
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors duration-[120ms]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setQuickRange(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-[120ms] ${
                activeDays === d
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setActiveDays(30) }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setActiveDays(30) }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setExcludeTest((v) => !v)}
            className={`w-8 h-4.5 rounded-full relative transition-colors duration-[120ms] cursor-pointer ${
              excludeTest ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-[120ms] ${
                excludeTest ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-xs text-gray-600">Exclude test sessions</span>
        </label>
      </div>

      {/* Content — keep-alive: all mounted views stay in DOM, only active one is visible */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Overview — always mounted */}
        <div className={view !== 'overview' ? 'hidden' : ''}>
          <AdminOverviewView
            token={token}
            dateFrom={dateFrom}
            dateTo={dateTo}
            excludeTest={excludeTest}
            onSelectOrg={drillToOrg}
          />
        </div>

        {/* Org view — mounted on first visit, kept alive */}
        {mounted.org && selectedOrgId && (
          <div className={view !== 'org' ? 'hidden' : ''}>
            <AdminOrgView
              key={selectedOrgId}
              token={token}
              agentspaceId={selectedOrgId}
              orgName={selectedOrgName}
              dateFrom={dateFrom}
              dateTo={dateTo}
              excludeTest={excludeTest}
              onSelectAgent={drillToAgent}
              onBack={() => setView('overview')}
            />
          </div>
        )}

        {/* Agent view — mounted on first visit, kept alive */}
        {mounted.agent && selectedAgentId && (
          <div className={view !== 'agent' ? 'hidden' : ''}>
            <AdminAgentView
              key={selectedAgentId}
              token={token}
              agentId={selectedAgentId}
              agentName={selectedAgentName}
              dateFrom={dateFrom}
              dateTo={dateTo}
              excludeTest={excludeTest}
              onSelectRun={setSelectedRunId}
              onBack={() => setView('org')}
            />
          </div>
        )}
      </div>

      <RunDetailPanel
        token={token}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </div>
  )
}
