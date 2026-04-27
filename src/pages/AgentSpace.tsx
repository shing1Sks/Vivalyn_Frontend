import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Link2,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Settings2,
  ToggleLeft,
  ToggleRight,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useScrollLock } from '../hooks/useScrollLock'
import { AgentSpaceProvider, useAgentSpace } from '../context/AgentSpaceContext'
import { TokenProvider } from '../context/TokenContext'
import AgentSpaceHeader from '../components/agentspace/AgentSpaceHeader'
import CreateAgentSpaceModal from '../components/agentspace/CreateAgentSpaceModal'
import MembersPanel from '../components/agentspace/MembersPanel'
import InvitesPanel from '../components/agentspace/InvitesPanel'
import PlanPanel from '../components/agentspace/PlanPanel'
import BillingPanel from '../components/agentspace/BillingPanel'
import InboxPanel from '../components/agentspace/InboxPanel'
import CreateAgentWizard from '../components/agentspace/CreateAgentWizard'
import AgentConfigureView from '../components/agentspace/wizard/AgentConfigureView'
import CreateQnAAgentWizard from '../components/agentspace/wizard/CreateQnAAgentWizard'
import QnAConfigureView from '../components/agentspace/wizard/QnAConfigureView'
import {
  exportAgentspaceRuns,
  fetchAgents,
  fetchAgentspaceRuns,
  fetchAgentspaceSubscription,
  toggleAgentStatus,
  updateAgent,
  type Agent,
  type AgentspaceSubscription,
  type EvaluationReport,
  type RunRecord,
} from '../lib/api'
import NoActivePlanScreen from '../components/agentspace/NoActivePlanScreen'
import RunDetailPanel from '../components/agentspace/RunDetailPanel'
import { fadeInUp, staggerContainer } from '../lib/motion'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function avgScore(report: EvaluationReport | null): string {
  if (!report?.scoring) return '—'
  const vals = Object.values(report.scoring) as number[]
  if (!vals.length) return '—'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '').replace(/"/g, '""')
  return `"${str}"`
}

function flattenTranscript(transcript: RunRecord['transcript']): string {
  if (!transcript) return ''
  return transcript.map(t => {
    let content: string
    if (typeof t.content === 'string') {
      content = t.content
    } else if (t.content && typeof t.content === 'object') {
      if (typeof (t.content as Record<string, unknown>).excerpt === 'string') {
        content = (t.content as Record<string, unknown>).excerpt as string
      } else if (typeof (t.content as Record<string, unknown>).text === 'string') {
        content = (t.content as Record<string, unknown>).text as string
      } else {
        content = JSON.stringify(t.content)
      }
    } else {
      content = String(t.content)
    }
    return `${t.role}: ${content}`
  }).join('\n')
}

function exportCsv(rows: RunRecord[]) {
  // Collect all unique scoring metric keys across rows
  const metricKeys = new Set<string>()
  for (const r of rows) {
    if (r.evaluation_report?.scoring) {
      for (const key of Object.keys(r.evaluation_report.scoring)) {
        metricKeys.add(key)
      }
    }
  }
  const sortedMetricKeys = [...metricKeys].sort()

  const headers = [
    'Date',
    'User',
    'Email',
    'Agent',
    'Type',
    'Score',
    ...sortedMetricKeys,
    'Summary',
    'Transcript Summary',
    'Highlights',
    'Feedback',
    'Transcript',
  ]

  const csvRows = rows.map(r => {
    const report = r.evaluation_report
    const score = avgScore(report)
    const metrics = sortedMetricKeys.map(k => report?.scoring?.[k] ?? '')

    return [
      new Date(r.created_at).toLocaleDateString(),
      r.user_name,
      r.user_email,
      r.agent_display_label || r.agent_name,
      r.is_test ? 'Test' : 'Live',
      score,
      ...metrics,
      report?.summary ?? '',
      report?.transcript_summary ?? '',
      (report?.highlights ?? []).join(' | '),
      (report?.feedback ?? []).join(' | '),
      flattenTranscript(r.transcript),
    ].map(escapeCsvCell).join(',')
  })

  const csv = [headers.join(','), ...csvRows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'run-records-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Agent list row ──────────────────────────────────────────────────────────────

interface AgentRowProps {
  agent: Agent
  token: string
  onConfigure: () => void
  onStatusChange: (updated: Agent) => void
}

function AgentRow({ agent, token, onConfigure, onStatusChange }: AgentRowProps) {
  const isLive = agent.agent_status === 'live'
  const [toggling, setToggling] = useState(false)
  const [showReport, setShowReport] = useState(agent.show_report)
  const [togglingReport, setTogglingReport] = useState(false)
  const [copiedLive, setCopiedLive] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)

  async function handleToggleStatus() {
    if (toggling) return
    const next: 'live' | 'idle' = isLive ? 'idle' : 'live'
    setToggling(true)
    try {
      const updated = await toggleAgentStatus(token, agent.id, next)
      onStatusChange(updated)
    } catch { /* silent */ } finally {
      setToggling(false)
    }
  }

  async function handleToggleReport() {
    if (togglingReport) return
    const next = !showReport
    setTogglingReport(true)
    try {
      const updated = await updateAgent(token, agent.id, { show_report: next })
      setShowReport(updated.show_report)
      onStatusChange(updated)
    } catch { /* silent */ } finally {
      setTogglingReport(false)
    }
  }

  function copyLink(url: string, which: 'live' | 'test') {
    navigator.clipboard.writeText(url).then(() => {
      if (which === 'live') {
        setCopiedLive(true)
        setTimeout(() => setCopiedLive(false), 2000)
      } else {
        setCopiedTest(true)
        setTimeout(() => setCopiedTest(false), 2000)
      }
    })
  }

  const liveUrl = `${window.location.origin}/agent/${agent.id}`
  const testUrl = `${window.location.origin}/agent/${agent.id}?mode=test`

  return (
    <>
      {/* ── Mobile card (< md) ───────────────────────────────────────────── */}
      <div className="md:hidden px-4 py-3 hover:bg-gray-50/60 duration-[120ms] border-b border-gray-50 last:border-0">
        {/* Row 1: icon + name + status/language badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{agent.agent_display_label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${agent.agent_type === 'qna' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              {agent.agent_type === 'qna' ? 'QnA' : 'General'}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 ${isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {isLive ? 'Live' : 'Idle'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
              {agent.agent_language}
            </span>
          </div>
        </div>
        {/* Row 2: action buttons + date */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-0.5">
            <button onClick={() => copyLink(liveUrl, 'live')} title="Copy live link" className={`p-1.5 rounded-lg duration-[120ms] ${isLive ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'}`}>
              {copiedLive ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => copyLink(testUrl, 'test')} title="Copy test link" className="p-1.5 rounded-lg text-orange-400 hover:text-orange-600 hover:bg-orange-50 duration-[120ms]">
              {copiedTest ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={handleToggleStatus} disabled={toggling} title={isLive ? 'Pause agent' : 'Deploy agent live'} className="group p-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 duration-[120ms]">
              {toggling ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : isLive ? <ToggleRight className="w-6 h-6 text-emerald-500 group-hover:text-indigo-600 duration-[120ms]" /> : <ToggleLeft className="w-6 h-6 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />}
            </button>
            <button onClick={handleToggleReport} disabled={togglingReport} title={showReport ? 'Hide report from candidates' : 'Show report to candidates'} className="group p-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 duration-[120ms] relative">
              {togglingReport
                ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                : <>
                    <FileText className={`w-4 h-4 duration-[120ms] ${showReport ? 'text-indigo-600' : 'text-gray-300 group-hover:text-indigo-600'}`} />
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${showReport ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  </>
              }
            </button>
            <button onClick={onConfigure} title="Configure agent" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-gray-400">{formatRelativeDate(agent.created_at)}</span>
        </div>
      </div>

      {/* ── Desktop row (≥ md) ───────────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-[1fr_68px_90px_72px_60px_100px_80px_72px_60px] gap-x-4 px-5 py-3 items-center hover:bg-gray-50/60 duration-[120ms]">
        {/* Agent name + persona */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{agent.agent_display_label || agent.agent_name}</p>
          </div>
        </div>

        {/* Type */}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit ${agent.agent_type === 'qna' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
          {agent.agent_type === 'qna' ? 'QnA' : 'General'}
        </span>

        {/* Language */}
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 w-fit">
          {agent.agent_language}
        </span>

        {/* Status */}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 w-fit ${isLive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          {isLive ? 'Live' : 'Idle'}
        </span>

        {/* Report */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleToggleReport}
            disabled={togglingReport}
            title={showReport ? 'Disable report for candidates' : 'Show report to candidates'}
            className="group flex items-center p-1 rounded-lg hover:bg-indigo-50 disabled:opacity-50 duration-[120ms]"
          >
            {togglingReport ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : showReport ? (
              <ToggleRight className="w-6 h-6 text-indigo-600 group-hover:text-indigo-700 duration-[120ms]" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />
            )}
          </button>
        </div>

        {/* Created */}
        <span className="text-xs text-gray-400">{formatRelativeDate(agent.created_at)}</span>

        {/* Links */}
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => copyLink(liveUrl, 'live')} title="Copy live link" className={`p-1.5 rounded-lg duration-[120ms] ${isLive ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'}`}>
            {copiedLive ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => copyLink(testUrl, 'test')} title="Copy test link" className="p-1.5 rounded-lg text-orange-400 hover:text-orange-600 hover:bg-orange-50 duration-[120ms]">
            {copiedTest ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Deploy toggle */}
        <div className="flex items-center justify-center">
          <button onClick={handleToggleStatus} disabled={toggling} title={isLive ? 'Pause agent' : 'Deploy agent live'} className="group flex items-center p-1 rounded-lg hover:bg-indigo-50 disabled:opacity-50 duration-[120ms]">
            {toggling ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : isLive ? (
              <ToggleRight className="w-6 h-6 text-emerald-500 group-hover:text-indigo-600 duration-[120ms]" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />
            )}
          </button>
        </div>

        {/* Configure */}
        <div className="flex items-center justify-center">
          <button onClick={onConfigure} title="Configure agent" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}

// ── Records tab ────────────────────────────────────────────────────────────────

type SortField = 'created_at' | 'user_name' | 'agent_name' | 'score'
type FilterType = 'all' | 'live' | 'test'

interface RecordsTabProps {
  agentspaceId: string
  token: string
  agents: Agent[]
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) {
  if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-gray-500" />
    : <ChevronDown className="w-3 h-3 text-gray-500" />
}

function RecordsTab({ agentspaceId, token, agents }: RecordsTabProps) {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [runsTotal, setRunsTotal] = useState(0)
  const [runsPage, setRunsPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all')
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const agentDropdownRef = useRef<HTMLDivElement>(null)
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null)

  useScrollLock(!!selectedRun)

  const agentLabelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of agents) m.set(a.id, a.agent_display_label || a.agent_name)
    return m
  }, [agents])

  const agentOptions = useMemo(() => {
    return [...agentLabelMap.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [agentLabelMap])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setRunsPage(1)
  }, [search, filterType, selectedAgentId])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { runs: data, total } = await fetchAgentspaceRuns(
          token,
          agentspaceId,
          runsPage,
          10,
          {
            agentId: selectedAgentId !== 'all' ? selectedAgentId : undefined,
            search: search.trim() || undefined,
            isTest: filterType === 'live' ? false : filterType === 'test' ? true : undefined,
          },
        )
        setRuns(data)
        setRunsTotal(total)
      } catch {
        setRuns([])
        setRunsTotal(0)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [agentspaceId, token, runsPage, search, filterType, selectedAgentId])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedRuns = [...runs]
    .sort((a, b) => {
      if (sortField === 'score') {
        const an = parseFloat(avgScore(a.evaluation_report))
        const bn = parseFloat(avgScore(b.evaluation_report))
        const av = isNaN(an) ? -1 : an
        const bv = isNaN(bn) ? -1 : bn
        return sortDir === 'asc' ? av - bv : bv - av
      }
      let av: string, bv: string
      if (sortField === 'created_at') {
        av = a.created_at; bv = b.created_at
      } else if (sortField === 'user_name') {
        av = a.user_name; bv = b.user_name
      } else {
        av = a.agent_name; bv = b.agent_name
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or agent…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'live', 'test'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md duration-[120ms] capitalize ${
                filterType === f
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Agent selector */}
        {agentOptions.length > 0 && (
          <div ref={agentDropdownRef} className="relative">
            <button
              onClick={() => setAgentDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 duration-[120ms] w-44"
            >
              <Bot className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="flex-1 text-left truncate">
                {selectedAgentId === 'all' ? 'All agents' : (agentOptions.find(([id]) => id === selectedAgentId)?.[1] ?? 'All agents')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 duration-[120ms] ${agentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {agentDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 top-full mt-1 z-20 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-y-auto max-h-[240px]"
                >
                  {[['all', 'All agents'] as [string, string], ...agentOptions].map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => { setSelectedAgentId(id); setAgentDropdownOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm duration-[120ms] truncate ${
                        selectedAgentId === id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Export */}
        <button
          onClick={async () => {
            const rows = await exportAgentspaceRuns(token, agentspaceId, {
              agentId: selectedAgentId !== 'all' ? selectedAgentId : undefined,
              search: search.trim() || undefined,
              isTest: filterType === 'live' ? false : filterType === 'test' ? true : undefined,
            })
            exportCsv(rows)
          }}
          disabled={runs.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
        </div>
      ) : sortedRuns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No sessions yet.</p>
          {(search || filterType !== 'all' || selectedAgentId !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterType('all'); setSelectedAgentId('all') }}
              className="text-xs text-indigo-500 mt-2 hover:text-indigo-700 duration-[120ms]"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Table header — desktop only */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_80px_90px_72px] gap-x-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => toggleSort('user_name')}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 duration-[120ms]"
            >
              User <SortIcon field="user_name" sortField={sortField} sortDir={sortDir} />
            </button>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</span>
            <button
              onClick={() => toggleSort('agent_name')}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 duration-[120ms]"
            >
              Agent <SortIcon field="agent_name" sortField={sortField} sortDir={sortDir} />
            </button>
            <button
              onClick={() => toggleSort('score')}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 duration-[120ms]"
            >
              Score <SortIcon field="score" sortField={sortField} sortDir={sortDir} />
            </button>
            <button
              onClick={() => toggleSort('created_at')}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 duration-[120ms]"
            >
              Date <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
            </button>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {sortedRuns.map(run => (
              <RunRow
                key={run.id}
                run={run}
                agentLabel={run.agent_display_label || run.agent_name}
                selected={selectedRun?.id === run.id}
                onSelect={() => setSelectedRun(run)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {runsTotal > 10 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">
            {((runsPage - 1) * 10) + 1}–{Math.min(runsPage * 10, runsTotal)} of {runsTotal}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRunsPage(p => p - 1)}
              disabled={runsPage === 1}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setRunsPage(p => p + 1)}
              disabled={runsPage * 10 >= runsTotal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Detail sidebar */}
      <AnimatePresence>
        {selectedRun && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/10 z-30"
              onClick={() => setSelectedRun(null)}
            />
            <RunDetailPanel
              key={selectedRun.id}
              run={selectedRun}
              agentspaceId={agentspaceId}
              token={token}
              onClose={() => setSelectedRun(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Run row ────────────────────────────────────────────────────────────────────

interface RunRowProps {
  run: RunRecord
  agentLabel: string
  selected: boolean
  onSelect: () => void
}

function RunRow({ run, agentLabel, selected, onSelect }: RunRowProps) {
  const score = avgScore(run.evaluation_report)

  return (
    <>
      {/* ── Mobile card (< md) ───────────────────────────────────────────── */}
      <button
        onClick={onSelect}
        className={`md:hidden w-full px-4 py-3 text-left flex flex-col gap-1 duration-[120ms] border-b border-gray-50 last:border-0 ${
          selected ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{run.user_name}</span>
          <span className={`text-sm font-semibold shrink-0 ${score === '—' ? 'text-gray-300' : 'text-gray-800'}`}>
            {score !== '—' ? `${score}/10` : score}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-400 truncate">{run.user_email}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${run.is_test ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {run.is_test ? 'Test' : 'Live'}
            </span>
            <span className="text-xs text-gray-400">{formatRelativeDate(run.created_at)}</span>
          </div>
        </div>
        <span className="text-xs text-gray-500">{agentLabel}</span>
      </button>

      {/* ── Desktop row (≥ md) ───────────────────────────────────────────── */}
      <button
        onClick={onSelect}
        className={`hidden md:grid w-full grid-cols-[1fr_1fr_1fr_80px_90px_72px] gap-x-3 px-5 py-3 text-left duration-[120ms] ${
          selected ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'
        }`}
      >
        <span className="text-sm text-gray-800 font-medium truncate">{run.user_name}</span>
        <span className="text-sm text-gray-500 truncate">{run.user_email}</span>
        <span className="text-sm text-gray-600 truncate">{agentLabel}</span>
        <span className={`text-sm font-semibold ${score === '—' ? 'text-gray-300' : 'text-gray-800'}`}>
          {score !== '—' ? `${score}/10` : score}
        </span>
        <span className="text-xs text-gray-400">{formatRelativeDate(run.created_at)}</span>
        <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit ${run.is_test ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {run.is_test ? 'Test' : 'Live'}
        </span>
      </button>
    </>
  )
}

// ── Empty agents state ──────────────────────────────────────────────────────────

function EmptyAgentsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Bot className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">No training agents yet</p>
      <p className="text-xs text-gray-400 mb-5 max-w-xs">
        Create your first voice training agent using the planner — it only takes a few minutes.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 duration-[120ms]"
      >
        <Plus className="w-4 h-4" />
        Create Training Agent
      </button>
    </div>
  )
}

// ── Main content ───────────────────────────────────────────────────────────────

type DashTab = 'agents' | 'records'

function AgentSpaceContent() {
  const { activeSpace, spaces, spacesLoading, spacesError, refetchSpaces } = useAgentSpace()
  const { signOut, session } = useAuth()
  const navigate = useNavigate()

  const [createOpen, setCreateOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [invitesOpen, setInvitesOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [typeSelectOpen, setTypeSelectOpen] = useState(false)
  const [createAgentOpen, setCreateAgentOpen] = useState(false)
  const [createQnAAgentOpen, setCreateQnAAgentOpen] = useState(false)
  const [dashTab, setDashTab] = useState<DashTab>('agents')

  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [configuringAgent, setConfiguringAgent] = useState<Agent | null>(null)
  const [agentSearch, setAgentSearch] = useState('')
  const [agentFilter, setAgentFilter] = useState<'all' | 'live' | 'idle'>('all')
  const [agentsPage, setAgentsPage] = useState(1)
  const [createdByFilter, setCreatedByFilter] = useState<string | null>(null)
  const [creatorDropdownOpen, setCreatorDropdownOpen] = useState(false)
  const creatorDropdownRef = useRef<HTMLDivElement>(null)

  useScrollLock(typeSelectOpen)
  useScrollLock(!!configuringAgent)

  const uniqueCreators = useMemo(
    () => Array.from(new Set(agents.map(a => a.created_by_name))).sort(),
    [agents],
  )

  const retryCount = useRef(0)

  useEffect(() => {
    if (!spacesLoading && spaces.length === 0 && !spacesError && retryCount.current < 5) {
      const timer = setTimeout(() => {
        retryCount.current += 1
        refetchSpaces()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [spacesLoading, spaces.length, spacesError, refetchSpaces])

  useEffect(() => {
    setAgentsPage(1)
  }, [agentSearch, agentFilter, createdByFilter])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (creatorDropdownRef.current && !creatorDropdownRef.current.contains(e.target as Node)) {
        setCreatorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [subscription, setSubscription] = useState<AgentspaceSubscription | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false)

  const spaceId = activeSpace?.id
  const spaceToken = session?.access_token

  useEffect(() => {
    if (!spaceId || !spaceToken) return
    async function load() {
      setAgentsLoading(true)
      try {
        const data = await fetchAgents(spaceToken!, spaceId!)
        setAgents(data)
      } catch {
        setAgents([])
      } finally {
        setAgentsLoading(false)
      }
    }
    void load()
  }, [spaceId, spaceToken])

  useEffect(() => {
    if (!spaceId || !spaceToken) return
    setSubscriptionLoading(true)
    setExpiryBannerDismissed(false)
    fetchAgentspaceSubscription(spaceToken, spaceId)
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [spaceId, spaceToken])

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  function handleWizardClose() {
    setCreateAgentOpen(false)
    if (activeSpace && session) {
      fetchAgents(session.access_token, activeSpace.id).then(setAgents).catch(() => {})
    }
  }

  function handleQnAWizardClose() {
    setCreateQnAAgentOpen(false)
    if (activeSpace && session) {
      fetchAgents(session.access_token, activeSpace.id).then(setAgents).catch(() => {})
    }
  }

  if (spacesLoading) {
    return (
      <>
        <AgentSpaceHeader
          onSignOut={handleSignOut}
          onCreateSpaceClick={() => setCreateOpen(true)}
          onMembersClick={() => setMembersOpen(true)}
          onInvitesClick={() => setInvitesOpen(true)}
          onPlanClick={() => setPlanOpen(true)}
          onBillingClick={() => setBillingOpen(true)}
          onInboxClick={() => setInboxOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
      </>
    )
  }

  if (spacesError) {
    return (
      <>
        <AgentSpaceHeader
          onSignOut={handleSignOut}
          onCreateSpaceClick={() => setCreateOpen(true)}
          onMembersClick={() => setMembersOpen(true)}
          onInvitesClick={() => setInvitesOpen(true)}
          onPlanClick={() => setPlanOpen(true)}
          onBillingClick={() => setBillingOpen(true)}
          onInboxClick={() => setInboxOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-red-500">{spacesError}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <AgentSpaceHeader
        onSignOut={handleSignOut}
        onCreateSpaceClick={() => setCreateOpen(true)}
        onMembersClick={() => setMembersOpen(true)}
        onInvitesClick={() => setInvitesOpen(true)}
        onPlanClick={() => setPlanOpen(true)}
        onBillingClick={() => setBillingOpen(true)}
        onInboxClick={() => setInboxOpen(true)}
      />

      <main className="flex-1 px-4 md:px-6 py-4 md:py-6">
        {activeSpace ? (
          subscriptionLoading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
          ) : !subscription?.has_subscription || subscription.status !== 'active' ? (
            <NoActivePlanScreen subscription={subscription} />
          ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-5">

            {/* Expiring-soon warning */}
            {(() => {
              if (!subscription?.period_end || expiryBannerDismissed) return null
              const msLeft = new Date(subscription.period_end).getTime() - Date.now()
              const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
              if (daysLeft > 7 || daysLeft < 0) return null
              const dateLabel = new Date(subscription.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <motion.div variants={fadeInUp} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 truncate">
                      Your plan expires on <span className="font-semibold">{dateLabel}</span>.{' '}
                      <a
                        href={`mailto:hello@vivalyn.in?subject=${encodeURIComponent('Plan Renewal — ' + (subscription.plan_tier ?? 'Vivalyn'))}`}
                        className="underline underline-offset-2 hover:text-amber-900 duration-[120ms]"
                      >
                        Contact us to renew.
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={() => setExpiryBannerDismissed(true)}
                    className="text-amber-500 hover:text-amber-800 shrink-0 duration-[120ms]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )
            })()}

            {/* Tab bar */}
            <motion.div variants={fadeInUp}>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                {(['agents', 'records'] as DashTab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setDashTab(t)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md duration-[120ms] capitalize ${
                      dashTab === t
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Tab content */}
            <motion.div variants={fadeInUp}>
              {dashTab === 'agents' ? (
                <div>
                  {/* Toolbar */}
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        value={agentSearch}
                        onChange={e => setAgentSearch(e.target.value)}
                        placeholder="Search agents…"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
                      />
                    </div>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                      {(['all', 'live', 'idle'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setAgentFilter(f)}
                          className={`px-3 py-1 text-xs font-medium rounded-md duration-[120ms] capitalize ${
                            agentFilter === f
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    {/* Created by filter */}
                    {uniqueCreators.length > 1 && (
                      <div ref={creatorDropdownRef} className="relative">
                        <button
                          onClick={() => setCreatorDropdownOpen(o => !o)}
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 duration-[120ms] w-44"
                        >
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="flex-1 text-left truncate">
                            {createdByFilter ?? 'All creators'}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 duration-[120ms] ${creatorDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {creatorDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute left-0 top-full mt-1 z-20 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-y-auto max-h-[240px]"
                            >
                              {[null, ...uniqueCreators].map(name => (
                                <button
                                  key={name ?? '__all__'}
                                  onClick={() => { setCreatedByFilter(name); setCreatorDropdownOpen(false) }}
                                  className={`w-full text-left px-3 py-2 text-sm duration-[120ms] truncate ${
                                    createdByFilter === name
                                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                                      : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {name ?? 'All creators'}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <button
                      onClick={() => setTypeSelectOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 duration-[120ms] w-full md:w-auto justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Create Training Agent
                    </button>
                  </div>

                  {(() => {
                    const filteredAgents = agents
                      .filter(a => {
                        if (agentFilter === 'live') return a.agent_status === 'live'
                        if (agentFilter === 'idle') return a.agent_status !== 'live'
                        return true
                      })
                      .filter(a => !createdByFilter || a.created_by_name === createdByFilter)
                      .filter(a => {
                        if (!agentSearch.trim()) return true
                        return a.agent_name.toLowerCase().includes(agentSearch.toLowerCase())
                      })

                    const agentsPageSize = 10
                    const agentsTotalPages = Math.ceil(filteredAgents.length / agentsPageSize)
                    const pagedAgents = filteredAgents.slice(
                      (agentsPage - 1) * agentsPageSize,
                      agentsPage * agentsPageSize,
                    )

                    if (agentsLoading) {
                      return (
                        <div className="flex items-center justify-center py-16">
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        </div>
                      )
                    }

                    if (agents.length === 0) {
                      return <EmptyAgentsState onCreate={() => setTypeSelectOpen(true)} />
                    }

                    if (filteredAgents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-dashed border-gray-200 rounded-xl">
                          <p className="text-sm text-gray-400">No agents match your filters.</p>
                          <button
                            onClick={() => { setAgentSearch(''); setAgentFilter('all'); setCreatedByFilter(null) }}
                            className="text-xs text-indigo-500 mt-2 hover:text-indigo-700 duration-[120ms]"
                          >
                            Clear filters
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          {/* Table header — desktop only */}
                          <div className="hidden md:grid grid-cols-[1fr_68px_90px_72px_60px_100px_80px_72px_60px] gap-x-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Language</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Report</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Links</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Deploy</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Config</span>
                          </div>
                          {/* Rows */}
                          <div className="divide-y divide-gray-50">
                            {pagedAgents.map(agent => (
                              <AgentRow
                                key={agent.id}
                                agent={agent}
                                token={session?.access_token ?? ''}
                                onConfigure={() => setConfiguringAgent(agent)}
                                onStatusChange={updated =>
                                  setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
                                }
                              />
                            ))}
                          </div>
                        </div>

                        {/* Pagination */}
                        {agentsTotalPages > 1 && (
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-gray-500">
                              {((agentsPage - 1) * agentsPageSize) + 1}–{Math.min(agentsPage * agentsPageSize, filteredAgents.length)} of {filteredAgents.length}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setAgentsPage(p => p - 1)}
                                disabled={agentsPage === 1}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                              </button>
                              <button
                                onClick={() => setAgentsPage(p => p + 1)}
                                disabled={agentsPage >= agentsTotalPages}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
                              >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <RecordsTab
                  agentspaceId={activeSpace.id}
                  token={session?.access_token ?? ''}
                  agents={agents}
                />
              )}
            </motion.div>

          </motion.div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center min-h-[60vh]"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-500">Setting up your agentspace…</p>
            </div>
          </motion.div>
        )}
      </main>

      <CreateAgentSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => setCreateOpen(false)}
      />

      <MembersPanel open={membersOpen} onClose={() => setMembersOpen(false)} />
      <InvitesPanel open={invitesOpen} onClose={() => setInvitesOpen(false)} />
      <PlanPanel open={planOpen} onClose={() => setPlanOpen(false)} />
      <BillingPanel open={billingOpen} onClose={() => setBillingOpen(false)} />

      <InboxPanel
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
      />

      {/* Agent type selection modal */}
      <AnimatePresence>
        {typeSelectOpen && (
          <>
            <motion.div
              key="type-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 z-50"
              onClick={() => setTypeSelectOpen(false)}
            />
            <motion.div
              key="type-modal"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900">What kind of agent do you want to create?</h2>
                  <button
                    onClick={() => setTypeSelectOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 duration-[120ms]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => { setTypeSelectOpen(false); setCreateAgentOpen(true) }}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl border border-gray-200 text-left hover:border-gray-300 hover:bg-gray-50 duration-[120ms]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">General Agent</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Flexible AI conversation agent with open-ended prompting</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setTypeSelectOpen(false); setCreateQnAAgentOpen(true) }}
                    className="flex flex-col items-start gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 text-left hover:border-indigo-300 hover:bg-indigo-50 duration-[120ms]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <ListChecks className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">QnA Assessment Agent</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Structured question bank with fixed and randomized pools</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {activeSpace && (
        <CreateAgentWizard
          open={createAgentOpen}
          agentspaceId={activeSpace.id}
          onClose={handleWizardClose}
        />
      )}

      {activeSpace && (
        <CreateQnAAgentWizard
          open={createQnAAgentOpen}
          agentspaceId={activeSpace.id}
          onClose={handleQnAWizardClose}
        />
      )}

      {/* Agent configure panel — full-screen overlay */}
      <AnimatePresence>
        {configuringAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-white flex flex-col"
          >
            <div className="h-14 border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
              <div className="w-24 shrink-0">
                <button
                  onClick={() => setConfiguringAgent(null)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 duration-[120ms]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
              <div className="flex-1 flex justify-center min-w-0">
                <span className="text-sm font-medium text-gray-700 truncate">{configuringAgent.agent_name}</span>
              </div>
              <div className="w-24 shrink-0 flex justify-end">
                <button
                  onClick={() => setConfiguringAgent(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 duration-[120ms]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {configuringAgent.agent_type === 'qna' ? (
                <QnAConfigureView agent={configuringAgent} />
              ) : (
                <AgentConfigureView
                  spec={configuringAgent.agent_prompt}
                  agentId={configuringAgent.id}
                  agentName={configuringAgent.agent_name}
                  agentDisplayLabel={configuringAgent.agent_display_label}
                  agentLanguage={configuringAgent.agent_language}
                  agentVoice={configuringAgent.agent_voice}
                  evaluationMetrics={configuringAgent.transcript_evaluation_metrics}
                  sessionDesignConfig={configuringAgent.session_design_config}
                  evalConfig={configuringAgent.eval_config}
                  onSaved={spec => {
                    setConfiguringAgent(prev => prev ? { ...prev, agent_prompt: spec } : null)
                    setAgents(prev =>
                      prev.map(a => a.id === configuringAgent.id ? { ...a, agent_prompt: spec } : a),
                    )
                  }}
                  onAgentUpdated={updates => {
                    setConfiguringAgent(prev => prev ? { ...prev, ...updates } : null)
                    setAgents(prev =>
                      prev.map(a => a.id === configuringAgent!.id ? { ...a, ...updates } : a),
                    )
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Page root ──────────────────────────────────────────────────────────────────

export default function AgentSpace() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <AgentSpaceProvider>
      <TokenProvider>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <AgentSpaceContent />
        </div>
      </TokenProvider>
    </AgentSpaceProvider>
  )
}
