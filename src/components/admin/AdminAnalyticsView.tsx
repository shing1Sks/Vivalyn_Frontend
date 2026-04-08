import { useState } from 'react'
import { BarChart2, ChevronRight, Coins } from 'lucide-react'
import { AdminOverviewView } from './AdminOverviewView'
import { AdminOrgView } from './AdminOrgView'
import { AdminAgentView } from './AdminAgentView'

type AnalyticsView = 'overview' | 'org' | 'agent'

interface AdminAnalyticsViewProps {
  token: string
  onSelectRun: (runId: string) => void
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultDateRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from: formatDate(from), to: formatDate(to) }
}

export function AdminAnalyticsView({ token, onSelectRun }: AdminAnalyticsViewProps) {
  const initial = defaultDateRange(30)
  const [dateFrom, setDateFrom] = useState(initial.from)
  const [dateTo, setDateTo] = useState(initial.to)
  const [activeDays, setActiveDays] = useState<7 | 30 | 90>(30)
  const [excludeTest, setExcludeTest] = useState(true)
  const [viewMode, setViewMode] = useState<'usage' | 'tokens'>('usage')

  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>('overview')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [selectedAgentName, setSelectedAgentName] = useState('')
  const [mounted, setMounted] = useState({ org: false, agent: false })

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
    setAnalyticsView('org')
  }

  function drillToAgent(agentId: string, agentName: string) {
    setSelectedAgentId(agentId)
    setSelectedAgentName(agentName)
    setMounted((m) => ({ ...m, agent: true }))
    setAnalyticsView('agent')
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Date filter bar — scoped to analytics only */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-wrap sticky top-0 z-10">
        {/* Quick range */}
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

        {/* Custom date inputs */}
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

        {/* Usage / Tokens toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
          {(['usage', 'tokens'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-[120ms] ${
                viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {m === 'usage' ? <BarChart2 className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
              {m === 'usage' ? 'Usage' : 'Tokens'}
            </button>
          ))}
        </div>

        {/* Exclude test toggle */}
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

      {/* Breadcrumb */}
      {analyticsView !== 'overview' && (
        <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-1.5 text-sm">
          <button
            onClick={() => setAnalyticsView('overview')}
            className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
          >
            Analytics
          </button>
          {(analyticsView === 'org' || analyticsView === 'agent') && selectedOrgName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <button
                onClick={() => setAnalyticsView('org')}
                className={`font-medium transition-colors duration-[120ms] ${
                  analyticsView === 'agent'
                    ? 'text-indigo-600 hover:text-indigo-700'
                    : 'text-gray-700'
                }`}
              >
                {selectedOrgName}
              </button>
            </>
          )}
          {analyticsView === 'agent' && selectedAgentName && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <span className="text-gray-700 font-medium">{selectedAgentName}</span>
            </>
          )}
        </div>
      )}

      {/* Content — keep-alive pattern */}
      <div className="px-6 py-6 max-w-7xl mx-auto w-full">
        {/* Overview — always mounted */}
        <div className={analyticsView !== 'overview' ? 'hidden' : ''}>
          <AdminOverviewView
            token={token}
            dateFrom={dateFrom}
            dateTo={dateTo}
            excludeTest={excludeTest}
            viewMode={viewMode}
            onSelectOrg={drillToOrg}
          />
        </div>

        {/* Org view — mounted on first drill-in */}
        {mounted.org && selectedOrgId && (
          <div className={analyticsView !== 'org' ? 'hidden' : ''}>
            <AdminOrgView
              key={selectedOrgId}
              token={token}
              agentspaceId={selectedOrgId}
              orgName={selectedOrgName}
              dateFrom={dateFrom}
              dateTo={dateTo}
              excludeTest={excludeTest}
              viewMode={viewMode}
              onSelectAgent={drillToAgent}
              onBack={() => setAnalyticsView('overview')}
            />
          </div>
        )}

        {/* Agent view — mounted on first drill-in */}
        {mounted.agent && selectedAgentId && (
          <div className={analyticsView !== 'agent' ? 'hidden' : ''}>
            <AdminAgentView
              key={selectedAgentId}
              token={token}
              agentId={selectedAgentId}
              agentName={selectedAgentName}
              dateFrom={dateFrom}
              dateTo={dateTo}
              excludeTest={excludeTest}
              viewMode={viewMode}
              onSelectRun={onSelectRun}
              onBack={() => setAnalyticsView('org')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
