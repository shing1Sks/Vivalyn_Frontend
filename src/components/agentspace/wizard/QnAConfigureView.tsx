import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Sparkles, Trash2, Zap, ArrowLeftRight } from 'lucide-react'
import {
  rewriteAgentSection,
  updateAgent,
  updateAgentQuestionBank,
  generateEvaluationCriteria,
  type Agent,
  type QnAPromptSpec,
  type QnAQuestion,
  type QnAQuestionBank,
} from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  agent: Agent
}

type Tab = 'questions' | 'profile' | 'evaluation'

// ── AI rewrite popup ───────────────────────────────────────────────────────────

interface AiRewritePopupProps {
  onApply: (instruction: string) => void
  onClose: () => void
  loading: boolean
}

function AiRewritePopup({ onApply, onClose, loading }: AiRewritePopupProps) {
  const [instruction, setInstruction] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-md p-3 w-72"
    >
      <input
        autoFocus
        type="text"
        value={instruction}
        onChange={e => setInstruction(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && instruction.trim() && !loading) { onApply(instruction.trim()); } if (e.key === 'Escape') onClose() }}
        placeholder="Describe the change..."
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { if (instruction.trim() && !loading) onApply(instruction.trim()) }}
          disabled={!instruction.trim() || loading}
          className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Apply
        </button>
        <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 duration-[120ms]">
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

// ── Question bank editor ───────────────────────────────────────────────────────

interface QuestionBankEditorProps {
  bank: QnAQuestionBank
  onChange: (bank: QnAQuestionBank) => void
}

function QuestionBankEditor({ bank, onChange }: QuestionBankEditorProps) {
  function editFixed(id: string, text: string) {
    onChange({ ...bank, fixed: bank.fixed.map(q => q.id === id ? { ...q, text } : q) })
  }
  function deleteFixed(id: string) {
    onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== id) })
  }
  function moveFixedToPool(id: string) {
    const q = bank.fixed.find(q => q.id === id)
    if (!q) return
    onChange({ ...bank, fixed: bank.fixed.filter(q => q.id !== id), randomized_pool: [...bank.randomized_pool, q] })
  }
  function addFixed() {
    onChange({ ...bank, fixed: [...bank.fixed, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }] })
  }

  function editRandomized(id: string, text: string) {
    onChange({ ...bank, randomized_pool: bank.randomized_pool.map(q => q.id === id ? { ...q, text } : q) })
  }
  function deleteRandomized(id: string) {
    onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== id) })
  }
  function toggleCross(id: string) {
    onChange({ ...bank, randomized_pool: bank.randomized_pool.map(q => q.id === id ? { ...q, cross_question_enabled: !q.cross_question_enabled } : q) })
  }
  function movePoolToFixed(id: string) {
    const q = bank.randomized_pool.find(q => q.id === id)
    if (!q) return
    onChange({ ...bank, randomized_pool: bank.randomized_pool.filter(q => q.id !== id), fixed: [...bank.fixed, { ...q, cross_question_enabled: false }] })
  }
  function addRandomized() {
    onChange({ ...bank, randomized_pool: [...bank.randomized_pool, { id: crypto.randomUUID(), text: 'New question', cross_question_enabled: false }] })
  }

  const validCount = Math.min(bank.randomized_count, bank.randomized_pool.length)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        {/* Fixed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Fixed Questions</h4>
              <p className="text-xs text-gray-500 mt-0.5">Asked every session</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{bank.fixed.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {bank.fixed.map(q => (
              <QuestionItem key={q.id} question={q} showCross={false}
                onEdit={t => editFixed(q.id, t)} onDelete={() => deleteFixed(q.id)}
                onMove={() => moveFixedToPool(q.id)} />
            ))}
            <button onClick={addFixed} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
        </div>

        {/* Randomized */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Randomized Pool</h4>
              <p className="text-xs text-gray-500 mt-0.5">Sampled each session</p>
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">{bank.randomized_pool.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {bank.randomized_pool.map(q => (
              <QuestionItem key={q.id} question={q} showCross={true}
                onEdit={t => editRandomized(q.id, t)} onDelete={() => deleteRandomized(q.id)}
                onMove={() => movePoolToFixed(q.id)} onToggleCross={() => toggleCross(q.id)} />
            ))}
            <button onClick={addRandomized} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms] py-1.5 px-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
        </div>
      </div>

      {/* Count selector */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <span className="text-sm text-gray-700 flex-1">Questions picked per session from the pool</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ ...bank, randomized_count: Math.max(1, bank.randomized_count - 1) })}
            disabled={bank.randomized_count <= 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold text-gray-900">{validCount}</span>
          <button
            onClick={() => onChange({ ...bank, randomized_count: Math.min(bank.randomized_pool.length, bank.randomized_count + 1) })}
            disabled={bank.randomized_count >= bank.randomized_pool.length}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed duration-[120ms]"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuestionItemProps {
  question: QnAQuestion
  showCross: boolean
  onEdit: (text: string) => void
  onDelete: () => void
  onMove: () => void
  onToggleCross?: () => void
}

function QuestionItem({ question, showCross, onEdit, onDelete, onMove, onToggleCross }: QuestionItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(question.text)

  function commitEdit() {
    const t = draft.trim()
    if (t && t !== question.text) onEdit(t)
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-2 group bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:border-gray-300 duration-[120ms]">
      {editing ? (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() } if (e.key === 'Escape') { setDraft(question.text); setEditing(false) } }}
          rows={2} className="flex-1 text-sm text-gray-900 resize-none border-none outline-none bg-transparent" />
      ) : (
        <p onClick={() => setEditing(true)} className="flex-1 text-sm text-gray-800 cursor-text leading-relaxed">{question.text}</p>
      )}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 duration-[120ms]">
        {showCross && onToggleCross && (
          <button onClick={onToggleCross} title={question.cross_question_enabled ? 'Disable cross-question' : 'Enable cross-question'}
            className={`p-1 rounded duration-[120ms] ${question.cross_question_enabled ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500'}`}>
            <Zap className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onMove} className="p-1 rounded text-gray-400 hover:text-gray-700 duration-[120ms]"><ArrowLeftRight className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1 rounded text-gray-400 hover:text-red-500 duration-[120ms]"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function QnAConfigureView({ agent }: Props) {
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('questions')

  const spec = agent.agent_prompt as QnAPromptSpec

  // Question bank state
  const [bank, setBank] = useState<QnAQuestionBank>(spec.question_bank)
  const [savingBank, setSavingBank] = useState(false)
  const [savedBankOk, setSavedBankOk] = useState(false)

  // Profile state
  const [editedIdentity, setEditedIdentity] = useState(spec.identity_and_persona)
  const [editedBrief, setEditedBrief] = useState(spec.session_brief)
  const [editedRules, setEditedRules] = useState<Record<string, string>>({ ...spec.behavior_rules })
  const [editedGuardrails, setEditedGuardrails] = useState<string[]>([...spec.guardrails])
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfileOk, setSavedProfileOk] = useState(false)

  // Evaluation state
  const [metricsList, setMetricsList] = useState<string[]>(agent.transcript_evaluation_metrics?.metrics ?? [])
  const [curatorPrompt, setCuratorPrompt] = useState(agent.transcript_evaluation_metrics?.report_curator_prompt ?? '')
  const [newMetric, setNewMetric] = useState('')
  const [evalCriteria, setEvalCriteria] = useState('')
  const [generatingEval, setGeneratingEval] = useState(false)
  const [savingEval, setSavingEval] = useState(false)
  const [savedEvalOk, setSavedEvalOk] = useState(false)

  // AI rewrite popups
  const [rewriteTarget, setRewriteTarget] = useState<string | null>(null)
  const [rewriting, setRewriting] = useState(false)

  // ── Question bank save ───────────────────────────────────────────────────────

  async function handleSaveBank() {
    if (!session) return
    setSavingBank(true)
    setSavedBankOk(false)
    try {
      await updateAgentQuestionBank(session.access_token, agent.id, bank)
      setSavedBankOk(true)
      setTimeout(() => setSavedBankOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingBank(false)
    }
  }

  // ── Profile save ─────────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!session) return
    setSavingProfile(true)
    setSavedProfileOk(false)
    const updatedSpec: QnAPromptSpec = {
      ...spec,
      identity_and_persona: editedIdentity,
      session_brief: editedBrief,
      behavior_rules: editedRules,
      guardrails: editedGuardrails,
      question_bank: bank,
    }
    try {
      await updateAgent(session.access_token, agent.id, { agent_prompt: updatedSpec as unknown as Parameters<typeof updateAgent>[2]['agent_prompt'] })
      setSavedProfileOk(true)
      setTimeout(() => setSavedProfileOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingProfile(false)
    }
  }

  // ── AI rewrite ───────────────────────────────────────────────────────────────

  async function handleRewrite(sectionName: string, currentContent: string, instruction: string) {
    if (!session) return
    setRewriting(true)
    try {
      const { updated_content } = await rewriteAgentSection(session.access_token, {
        section_name: sectionName,
        current_content: currentContent,
        instruction,
      })
      if (sectionName === 'identity_and_persona') setEditedIdentity(updated_content)
      else if (sectionName === 'session_brief') setEditedBrief(updated_content)
      else if (sectionName === 'guardrails') {
        try { setEditedGuardrails(JSON.parse(updated_content)) } catch { setEditedGuardrails(updated_content.split('\n').filter(l => l.trim())) }
      } else {
        try {
          const parsed = JSON.parse(updated_content)
          if (typeof parsed === 'object' && !Array.isArray(parsed)) setEditedRules(parsed)
        } catch { /* fall through */ }
      }
    } catch { /* silent */ } finally {
      setRewriting(false)
      setRewriteTarget(null)
    }
  }

  // ── Eval save ────────────────────────────────────────────────────────────────

  async function handleGenerateEval() {
    if (!session || !evalCriteria.trim()) return
    setGeneratingEval(true)
    try {
      const result = await generateEvaluationCriteria(session.access_token, {
        session_brief: spec.session_brief,
        users_raw_evaluation_criteria: evalCriteria.trim(),
      })
      setMetricsList(result.metrics)
      setCuratorPrompt(result.report_curator_prompt)
    } catch { /* silent */ } finally {
      setGeneratingEval(false)
    }
  }

  async function handleSaveEval() {
    if (!session) return
    setSavingEval(true)
    setSavedEvalOk(false)
    try {
      await updateAgent(session.access_token, agent.id, {
        transcript_evaluation_metrics: { report_curator_prompt: curatorPrompt, metrics: metricsList },
      })
      setSavedEvalOk(true)
      setTimeout(() => setSavedEvalOk(false), 3000)
    } catch { /* silent */ } finally {
      setSavingEval(false)
    }
  }

  // ── Tab nav ───────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'questions', label: 'Questions' },
    { key: 'profile', label: 'Profile' },
    { key: 'evaluation', label: 'Evaluation' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-gray-50 min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 md:px-6 py-2.5 md:py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Configure Agent</h2>
          <p className="hidden md:block text-xs text-gray-400 mt-0.5">{agent.agent_name} · QnA</p>
        </div>

        {activeTab === 'questions' && (
          <button onClick={handleSaveBank} disabled={savingBank}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]">
            {savingBank ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              : savedBankOk ? <><CheckCircle2 className="w-3 h-3" /> Saved</>
              : 'Save Changes'}
          </button>
        )}

        {activeTab === 'profile' && (
          <button onClick={handleSaveProfile} disabled={savingProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms]">
            {savingProfile ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              : savedProfileOk ? <><CheckCircle2 className="w-3 h-3" /> Saved</>
              : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 pt-4 bg-white border-b border-gray-100">
        <div className="flex gap-5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`pb-2.5 text-sm font-medium border-b-2 duration-[120ms] ${
                activeTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">

        {/* ── Questions tab ──────────────────────────────────────────────── */}
        {activeTab === 'questions' && (
          <div className="max-w-4xl mx-auto">
            <QuestionBankEditor bank={bank} onChange={setBank} />
          </div>
        )}

        {/* ── Profile tab ───────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Identity & Persona */}
            <SectionCard label="Identity & Persona">
              <SectionAiButton
                sectionName="identity_and_persona"
                currentContent={editedIdentity}
                active={rewriteTarget === 'identity_and_persona'}
                loading={rewriting && rewriteTarget === 'identity_and_persona'}
                onOpen={() => setRewriteTarget('identity_and_persona')}
                onClose={() => setRewriteTarget(null)}
                onApply={(instruction) => handleRewrite('identity_and_persona', editedIdentity, instruction)}
              />
              <textarea value={editedIdentity} onChange={e => setEditedIdentity(e.target.value)} rows={4}
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] bg-white" />
            </SectionCard>

            {/* Session Brief */}
            <SectionCard label="Session Brief">
              <SectionAiButton
                sectionName="session_brief"
                currentContent={editedBrief}
                active={rewriteTarget === 'session_brief'}
                loading={rewriting && rewriteTarget === 'session_brief'}
                onOpen={() => setRewriteTarget('session_brief')}
                onClose={() => setRewriteTarget(null)}
                onApply={(instruction) => handleRewrite('session_brief', editedBrief, instruction)}
              />
              <textarea value={editedBrief} onChange={e => setEditedBrief(e.target.value)} rows={3}
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] bg-white" />
            </SectionCard>

            {/* Behavior Rules */}
            <SectionCard label="Behavior Rules">
              <SectionAiButton
                sectionName="behavior_rules"
                currentContent={JSON.stringify(editedRules)}
                active={rewriteTarget === 'behavior_rules'}
                loading={rewriting && rewriteTarget === 'behavior_rules'}
                onOpen={() => setRewriteTarget('behavior_rules')}
                onClose={() => setRewriteTarget(null)}
                onApply={(instruction) => handleRewrite('behavior_rules', JSON.stringify(editedRules, null, 2), instruction)}
              />
              <div className="space-y-3">
                {['opening', 'transition', 'closing'].map(key => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{key}</p>
                    <textarea
                      value={editedRules[key] ?? ''}
                      onChange={e => setEditedRules(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={3}
                      className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] bg-white"
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Guardrails */}
            <SectionCard label="Guardrails">
              <SectionAiButton
                sectionName="guardrails"
                currentContent={JSON.stringify(editedGuardrails)}
                active={rewriteTarget === 'guardrails'}
                loading={rewriting && rewriteTarget === 'guardrails'}
                onOpen={() => setRewriteTarget('guardrails')}
                onClose={() => setRewriteTarget(null)}
                onApply={(instruction) => handleRewrite('guardrails', JSON.stringify(editedGuardrails), instruction)}
              />
              <div className="space-y-2">
                {editedGuardrails.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <textarea value={g} onChange={e => {
                      const next = [...editedGuardrails]; next[i] = e.target.value; setEditedGuardrails(next)
                    }} rows={2}
                      className="flex-1 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms] bg-white" />
                    <button onClick={() => setEditedGuardrails(prev => prev.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500 duration-[120ms] flex-shrink-0 mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setEditedGuardrails(prev => [...prev, ''])}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 duration-[120ms]">
                  <Plus className="w-4 h-4" /> Add guardrail
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Evaluation tab ─────────────────────────────────────────────── */}
        {activeTab === 'evaluation' && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Metrics list */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Scoring Metrics</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {metricsList.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
                    <span className="text-xs font-medium text-indigo-700">{m}</span>
                    <button onClick={() => setMetricsList(prev => prev.filter((_, j) => j !== i))}
                      className="text-indigo-400 hover:text-indigo-700 duration-[120ms]">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newMetric} onChange={e => setNewMetric(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newMetric.trim()) { setMetricsList(p => [...p, newMetric.trim()]); setNewMetric('') } }}
                  placeholder="Add metric..."
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]" />
                <button onClick={() => { if (newMetric.trim()) { setMetricsList(p => [...p, newMetric.trim()]); setNewMetric('') } }}
                  className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 duration-[120ms]">
                  Add
                </button>
              </div>
            </div>

            {/* Regenerate */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Regenerate Evaluation</h4>
              <p className="text-xs text-gray-500 mb-3">Describe how sessions should be evaluated and we'll regenerate the metrics.</p>
              <textarea value={evalCriteria} onChange={e => setEvalCriteria(e.target.value)} rows={3} placeholder="e.g. Focus on accuracy, depth, and communication clarity..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]" />
              <button onClick={handleGenerateEval} disabled={!evalCriteria.trim() || generatingEval}
                className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms]">
                {generatingEval ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generate
              </button>
            </div>

            {/* Curator prompt */}
            {curatorPrompt && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Evaluation Guide</h4>
                <textarea value={curatorPrompt} onChange={e => setCuratorPrompt(e.target.value)} rows={5}
                  className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 duration-[120ms]" />
              </div>
            )}

            <button onClick={handleSaveEval} disabled={savingEval}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed duration-[120ms] flex items-center justify-center gap-2">
              {savingEval ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : savedEvalOk ? <><CheckCircle2 className="w-4 h-4" /> Saved</>
                : 'Save Evaluation'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{label}</h4>
      {children}
    </div>
  )
}

// ── Section AI button ──────────────────────────────────────────────────────────

interface SectionAiButtonProps {
  sectionName: string
  currentContent: string
  active: boolean
  loading: boolean
  onOpen: () => void
  onClose: () => void
  onApply: (instruction: string) => void
}

function SectionAiButton({ active, loading, onOpen, onClose, onApply }: SectionAiButtonProps) {
  return (
    <div className="absolute top-3 right-4 z-10">
      <button
        onClick={() => active ? onClose() : onOpen()}
        className={`p-1.5 rounded-lg duration-[120ms] ${active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-50'}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {active && (
          <AiRewritePopup onApply={onApply} onClose={onClose} loading={loading} />
        )}
      </AnimatePresence>
    </div>
  )
}
