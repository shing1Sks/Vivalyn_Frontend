/**
 * AgentAccessLink — public page for labeled access links.
 *
 * Route: /a/:linkToken
 *
 * Resolves the link token → agent config (via /api/v1/access-links/:token/public-config),
 * then runs the same voice session experience as AgentLive but with the link's
 * show_report and one_per_email settings, and threads accessLinkToken through
 * OTP + WebSocket so runs are tagged to this link.
 *
 * State machine: loading → entry → session → ended → report / error
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Lock, X } from 'lucide-react'

import {
  fetchAccessLinkPublicConfig,
  fetchLatestRunRecord,
  type AccessLinkPublicConfig,
  type EvaluationReport,
} from '../lib/api'
import { useAgentSession, type SessionReport } from '../hooks/useAgentSession'
import EntryScreen from '../components/agentlive/EntryScreen'
import SessionScreen from '../components/agentlive/SessionScreen'
import TranscriptPanel from '../components/agentlive/TranscriptPanel'
import EndedScreen from '../components/agentlive/EndedScreen'
import ReportScreen from '../components/agentlive/ReportScreen'

type PageState = 'loading' | 'entry' | 'session' | 'ended' | 'report' | 'error'

// ── Active session (mounts useAgentSession once join details are known) ──────

interface ActiveSessionProps {
  agentId: string
  agentName: string
  email: string
  name: string
  agentFirstSpeaker: string
  showReport: boolean
  accessLinkToken: string
  onEnded: (turnCount: number, report: SessionReport | null) => void
}

function ActiveSession({
  agentId,
  agentName,
  email,
  name,
  agentFirstSpeaker,
  showReport,
  accessLinkToken,
  onEnded,
}: ActiveSessionProps) {
  const { phase, agentState, transcript, streamingAgentText, partialUserText, micEnabled, toggleMic, endSession, error, sessionReport, audioLevelRef } =
    useAgentSession({ agentId, email, name, mode: 'live', agentFirstSpeaker, accessLinkToken })

  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (phase === 'ended') {
      onEnded(transcript.filter(e => e.role === 'user').length, sessionReport)
    }
  }, [phase, transcript, onEnded, sessionReport])

  if (phase === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-gray-400">Starting your session…</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-gray-700 font-medium mb-2">{error ?? 'Connection failed'}</p>
          <p className="text-sm text-gray-400">Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  if (phase === 'reporting') {
    return (
      <EndedScreen
        agentName={agentName}
        turnCount={transcript.filter(e => e.role === 'user').length}
        isGeneratingReport={showReport}
        hideReport={!showReport}
      />
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex relative">
      <div className="flex-1 flex flex-col min-w-0">
        <SessionScreen
          agentName={agentName}
          userName={name}
          mode="live"
          agentState={agentState}
          micEnabled={micEnabled}
          onToggleMic={toggleMic}
          onEndCall={endSession}
          audioLevelRef={audioLevelRef}
          transcript={transcript}
          streamingAgentText={streamingAgentText}
          partialUserText={partialUserText}
          onOpenTranscriptDrawer={() => setDrawerOpen(true)}
        />
      </div>

      <div className="hidden md:flex w-72 border-l border-gray-800 bg-gray-950 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TranscriptPanel transcript={transcript} agentName={agentName} streamingAgentText={streamingAgentText} partialUserText={partialUserText} />
        </div>
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[85vw] max-w-sm bg-gray-950 border-l border-gray-800 z-50 flex flex-col md:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Transcript
              </h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 duration-[120ms]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TranscriptPanel transcript={transcript} agentName={agentName} streamingAgentText={streamingAgentText} partialUserText={partialUserText} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AgentAccessLink() {
  const { linkToken } = useParams<{ linkToken: string }>()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig] = useState<AccessLinkPublicConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [joinEmail, setJoinEmail] = useState('')
  const [joinName, setJoinName] = useState('')
  const [sessionStarted, setSessionStarted] = useState(false)
  const [endedTurnCount, setEndedTurnCount] = useState(0)
  const [reportData, setReportData] = useState<EvaluationReport | null>(null)
  const [isPollingReport, setIsPollingReport] = useState(false)

  useEffect(() => {
    if (!linkToken) return
    fetchAccessLinkPublicConfig(linkToken)
      .then(cfg => {
        setConfig(cfg)
        setPageState('entry')
      })
      .catch(err => {
        setLoadError(err.message ?? 'This link is unavailable.')
        setPageState('error')
      })
  }, [linkToken])

  const handleJoin = (email: string, name: string) => {
    setJoinEmail(email)
    setJoinName(name)
    setSessionStarted(true)
    setPageState('session')
  }

  const handleEnded = (turnCount: number, report: SessionReport | null) => {
    setEndedTurnCount(turnCount)
    if (!config?.show_report) {
      setPageState('ended')
      return
    }
    const hasScoring = report?.report && Object.keys(report.report.scoring ?? {}).length > 0
    if (hasScoring && report?.report) {
      setReportData(report.report)
      setPageState('ended')
    } else if (report !== null) {
      setPageState('ended')
    } else {
      setIsPollingReport(true)
      setPageState('ended')
    }
  }

  useEffect(() => {
    if (pageState !== 'ended' || !isPollingReport || !config?.agent_id) return
    let cancelled = false

    async function pollReport() {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const record = await fetchLatestRunRecord(config!.agent_id, joinEmail)
          if (cancelled) return
          if (record?.evaluation_report && Object.keys(record.evaluation_report.scoring ?? {}).length > 0) {
            setReportData(record.evaluation_report)
            setIsPollingReport(false)
            return
          }
        } catch { /* ignore */ }
        if (!cancelled && attempt < 1) {
          await new Promise(r => setTimeout(r, 3000))
        }
      }
      if (!cancelled) setIsPollingReport(false)
    }

    pollReport()
    return () => { cancelled = true }
  }, [pageState, isPollingReport, config, joinEmail])

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gray-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            {loadError ?? 'This link is unavailable'}
          </h2>
          <p className="text-sm text-gray-500">
            The link may be inactive or the session is no longer accepting participants.
          </p>
        </div>
      </div>
    )
  }

  if (pageState === 'report') {
    return (
      <ReportScreen
        report={reportData!}
        agentName={config?.agent_name ?? 'Agent'}
        userName={joinName}
        turnCount={endedTurnCount}
      />
    )
  }

  if (pageState === 'ended') {
    return (
      <EndedScreen
        agentName={config?.agent_name ?? 'Agent'}
        turnCount={endedTurnCount}
        isGeneratingReport={isPollingReport}
        reportAvailable={!!reportData}
        onViewReport={() => setPageState('report')}
        hideReport={!config?.show_report}
      />
    )
  }

  if (pageState === 'entry') {
    return (
      <EntryScreen
        agentName={config?.agent_name ?? 'Agent'}
        mode="live"
        onJoin={handleJoin}
        accessLinkToken={linkToken}
      />
    )
  }

  if (pageState === 'session' && sessionStarted && config && linkToken) {
    return (
      <ActiveSession
        agentId={config.agent_id}
        agentName={config.agent_name}
        email={joinEmail}
        name={joinName}
        agentFirstSpeaker={config.agent_first_speaker}
        showReport={config.show_report}
        accessLinkToken={linkToken}
        onEnded={handleEnded}
      />
    )
  }

  return null
}
