import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Mic, MicOff, Square } from 'lucide-react'
import { useAgentSession } from '../../../hooks/useAgentSession'
import type { SessionPhase } from '../../../hooks/useAgentSession'
import type { EvaluationReport } from '../../../lib/api'

// ── Props ──────────────────────────────────────────────────────────────────────

interface MiniTestSessionProps {
  agentId: string
  token: string
  email: string
  name: string
  agentFirstSpeaker?: string
  onPhaseChange?: (phase: SessionPhase | 'idle') => void
  shouldEnd?: boolean
}

// ── Eval report section ────────────────────────────────────────────────────────

function EvalReportSection({ report }: { report: EvaluationReport }) {
  const scores = Object.entries(report.scoring)

  return (
    <div className="border-t border-gray-100 px-6 py-6 space-y-5">
      <h3 className="text-sm font-semibold text-gray-900">Session report</h3>

      {report.summary && (
        <p className="text-sm text-gray-600 leading-relaxed">{report.summary}</p>
      )}

      {scores.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {scores.map(([metric, score]) => (
            <div key={metric} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 leading-tight line-clamp-2">{metric}</span>
                <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
                  {score}<span className="text-xs font-normal text-gray-400">/10</span>
                </span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    score >= 7 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${score * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {report.transcript_summary && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Transcript summary</p>
          <p className="text-sm text-gray-600 leading-relaxed">{report.transcript_summary}</p>
        </div>
      )}

      {report.highlights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Highlights</p>
          <ul className="space-y-1.5">
            {report.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.feedback.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Areas to improve</p>
          <ul className="space-y-1.5">
            {report.feedback.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Active session ─────────────────────────────────────────────────────────────

function MiniTestSessionActive({
  agentId, token, email, name, agentFirstSpeaker, onReset, onPhaseChange, shouldEnd,
}: MiniTestSessionProps & { onReset: () => void }) {
  const {
    phase, agentState, transcript, streamingAgentText, partialUserText,
    micEnabled, toggleMic, endSession, sessionReport,
  } = useAgentSession({ agentId, email, name, mode: 'test', token, agentFirstSpeaker })

  useEffect(() => {
    onPhaseChange?.(phase)
  }, [phase, onPhaseChange])

  useEffect(() => {
    if (shouldEnd && phase === 'active') endSession()
  }, [shouldEnd, phase, endSession])

  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, streamingAgentText, partialUserText])

  const agentStateLabel =
    agentState === 'speaking' ? 'Agent is speaking' :
    agentState === 'thinking' ? 'Agent is thinking' :
    'Your turn'

  const agentStateDotColor =
    agentState === 'speaking' ? 'bg-indigo-500' :
    agentState === 'thinking' ? 'bg-amber-400' :
    'bg-emerald-400'

  if (phase === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        <p className="text-sm text-gray-400">Connecting…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <p className="text-sm text-red-600 text-center">Could not connect to agent.</p>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-800 duration-[120ms] underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (phase === 'reporting') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        <p className="text-sm text-gray-400">Generating report…</p>
      </div>
    )
  }

  if (phase === 'ended') {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="px-6 py-5 space-y-2.5">
          {transcript.map((entry, i) => (
            <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                entry.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {entry.text}
              </div>
            </div>
          ))}
        </div>

        {sessionReport?.report && <EvalReportSection report={sessionReport.report} />}

        {!sessionReport?.report && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            Generating report…
          </div>
        )}

        <div className="px-6 py-5 flex justify-center">
          <button
            onClick={onReset}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 duration-[120ms]"
          >
            Start another test
          </button>
        </div>
      </div>
    )
  }

  // Active phase
  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${agentStateDotColor} ${agentState !== 'listening' ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-gray-500">{agentStateLabel}</span>
        </div>
        <button
          onClick={endSession}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 duration-[120ms]"
        >
          <Square className="w-3 h-3" />
          End
        </button>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
        {transcript.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
              entry.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {entry.text}
            </div>
          </div>
        ))}

        {streamingAgentText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed bg-gray-100 text-gray-800">
              {streamingAgentText}
              <span className="inline-block w-1 h-3.5 bg-gray-400 ml-0.5 animate-pulse rounded-sm align-middle" />
            </div>
          </div>
        )}

        {partialUserText && (
          <div className="flex justify-end">
            <div className="max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed bg-indigo-50 text-indigo-600 italic">
              {partialUserText}
            </div>
          </div>
        )}

        {transcript.length === 0 && !streamingAgentText && (
          <p className="text-sm text-gray-400 text-center pt-6">Session started — speak to begin</p>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Mic control */}
      <div className="shrink-0 border-t border-gray-100 px-5 py-3.5 flex items-center justify-center">
        <button
          onClick={toggleMic}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium duration-[120ms] ${
            micEnabled
              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          {micEnabled
            ? <><Mic className="w-4 h-4" /> Mic on</>
            : <><MicOff className="w-4 h-4" /> Mic off</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Public component ───────────────────────────────────────────────────────────

export default function MiniTestSession({ agentId, token, email, name, agentFirstSpeaker, onPhaseChange, shouldEnd }: MiniTestSessionProps) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started) onPhaseChange?.('idle')
  }, [started, onPhaseChange])

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8">
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
          <Bot className="w-7 h-7 text-indigo-500" />
        </div>
        <div className="text-center max-w-xs">
          <p className="text-base font-semibold text-gray-900 mb-1.5">Test your agent</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Start a voice session to hear how your agent responds before publishing.
          </p>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 duration-[120ms]"
        >
          Start test session
        </button>
      </div>
    )
  }

  return (
    <MiniTestSessionActive
      agentId={agentId}
      token={token}
      email={email}
      name={name}
      agentFirstSpeaker={agentFirstSpeaker}
      onPhaseChange={onPhaseChange}
      shouldEnd={shouldEnd}
      onReset={() => setStarted(false)}
    />
  )
}
