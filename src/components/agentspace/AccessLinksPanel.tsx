import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  FileText,
  FlaskConical,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  createAccessLink,
  deleteAccessLink,
  fetchAccessLinks,
  toggleAgentStatus,
  updateAccessLink,
  ApiError,
  type AccessLink,
  type Agent,
} from '../../lib/api'
import SlidePanel from './SlidePanel'

interface Props {
  agent: Agent | null
  open: boolean
  token: string
  onClose: () => void
  onAgentUpdate: (updated: Agent) => void
}

// ── Single link row ─────────────────────────────────────────────────────────────

interface LinkRowProps {
  link: AccessLink
  muted: boolean
  onUpdate: (updated: AccessLink) => void
  onDelete: (id: string) => void
  token: string
}

function LinkRow({ link, muted, onUpdate, onDelete, token }: LinkRowProps) {
  const [name, setName] = useState(link.name)
  const [editing, setEditing] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [togglingLive, setTogglingLive] = useState(false)
  const [togglingReport, setTogglingReport] = useState(false)
  const [togglingOnePerEmail, setTogglingOnePerEmail] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const url = link.token
    ? `${window.location.origin}/a/${link.token}`
    : `${window.location.origin}/agent/${link.agent_id}`

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (editing) nameInputRef.current?.focus()
  }, [editing])

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === link.name) {
      setName(link.name)
      setEditing(false)
      return
    }
    setSavingName(true)
    try {
      const updated = await updateAccessLink(token, link.id, { name: trimmed })
      onUpdate(updated)
      setEditing(false)
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Failed to save name.')
      setName(link.name)
    } finally {
      setSavingName(false)
    }
  }

  async function toggleField(field: 'is_live' | 'show_report' | 'one_per_email') {
    const setter =
      field === 'is_live' ? setTogglingLive
      : field === 'show_report' ? setTogglingReport
      : setTogglingOnePerEmail
    setter(true)
    try {
      const updated = await updateAccessLink(token, link.id, { [field]: !link[field] })
      onUpdate(updated)
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Update failed.')
    } finally {
      setter(false)
    }
  }

  async function handleDelete() {
    if (link.is_default) return
    setDeleting(true)
    setDropdownOpen(false)
    try {
      await deleteAccessLink(token, link.id)
      onDelete(link.id)
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Delete failed.')
      setDeleting(false)
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 transition-all duration-[120ms] ${
        deleting ? 'opacity-40 pointer-events-none' : ''
      } ${
        muted
          ? 'border-gray-100 bg-gray-50/40 opacity-50'
          : link.is_live
          ? 'border-gray-200 bg-white'
          : 'border-gray-100 bg-gray-50/60'
      }`}
    >
      {/* Name row */}
      <div className="flex items-center gap-2 mb-3">
        {link.is_default ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate">{link.name}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
              Default
            </span>
          </div>
        ) : editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              ref={nameInputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setName(link.name); setEditing(false) }
              }}
              onBlur={saveName}
              disabled={savingName}
              className="flex-1 min-w-0 text-sm font-medium text-gray-900 border border-indigo-400 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
            />
            {savingName && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 min-w-0 text-left text-sm font-medium text-gray-900 truncate hover:text-indigo-600 duration-[120ms] rounded"
            title="Click to rename"
          >
            {link.name}
          </button>
        )}

        <div ref={dropdownRef} className="relative shrink-0">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 duration-[120ms]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1"
              >
                {!link.is_default && (
                  <button
                    onClick={() => { setEditing(true); setDropdownOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 duration-[120ms]"
                  >
                    Rename
                  </button>
                )}
                <button
                  onClick={copyUrl}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 duration-[120ms]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy URL
                </button>
                <button
                  onClick={() => window.open(url, '_blank')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 duration-[120ms]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open link
                </button>
                {!link.is_default && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 duration-[120ms]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete link
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <span className="flex-1 min-w-0 text-xs text-gray-400 truncate font-mono">{url}</span>
        <button
          onClick={copyUrl}
          className="shrink-0 p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 duration-[120ms]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5">
        <button
          onClick={() => toggleField('is_live')}
          disabled={togglingLive}
          title={link.is_live ? 'Pause this link' : 'Make this link live'}
          className="group flex items-center gap-1.5 flex-1 px-2 py-1 rounded-md hover:bg-white duration-[120ms] disabled:opacity-50"
        >
          {togglingLive ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            : link.is_live ? <ToggleRight className="w-5 h-5 text-emerald-500 group-hover:text-indigo-600 duration-[120ms]" />
            : <ToggleLeft className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />}
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Live
          </span>
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={() => toggleField('show_report')}
          disabled={togglingReport}
          title={link.show_report ? 'Hide report from participants' : 'Show report to participants'}
          className="group flex items-center gap-1.5 flex-1 px-2 py-1 rounded-md hover:bg-white duration-[120ms] disabled:opacity-50"
        >
          {togglingReport ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            : link.show_report ? <ToggleRight className="w-5 h-5 text-indigo-500 group-hover:text-indigo-600 duration-[120ms]" />
            : <ToggleLeft className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />}
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <FileText className="w-3 h-3" /> Report
          </span>
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={() => toggleField('one_per_email')}
          disabled={togglingOnePerEmail}
          title={link.one_per_email ? 'Allow multiple sessions per email' : 'Block repeat sessions per email'}
          className="group flex items-center gap-1.5 flex-1 px-2 py-1 rounded-md hover:bg-white duration-[120ms] disabled:opacity-50"
        >
          {togglingOnePerEmail ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            : link.one_per_email ? <ToggleRight className="w-5 h-5 text-amber-500 group-hover:text-indigo-600 duration-[120ms]" />
            : <ToggleLeft className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />}
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Users className="w-3 h-3" /> 1/email
          </span>
        </button>
      </div>

      {rowError && <p className="text-xs text-red-500 mt-2">{rowError}</p>}
    </div>
  )
}

// ── Panel ───────────────────────────────────────────────────────────────────────

export default function AccessLinksPanel({ agent, open, token, onClose, onAgentUpdate }: Props) {
  const [links, setLinks] = useState<AccessLink[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [togglingDeploy, setTogglingDeploy] = useState(false)
  const [copiedTest, setCopiedTest] = useState(false)
  const newNameInputRef = useRef<HTMLInputElement>(null)

  const isDeployed = agent?.agent_status === 'live'
  const testUrl = agent ? `${window.location.origin}/agent/${agent.id}?mode=test` : ''

  const loadLinks = useCallback(async () => {
    if (!agent) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAccessLinks(token, agent.id)
      setLinks(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load access links.')
    } finally {
      setLoading(false)
    }
  }, [token, agent])

  useEffect(() => {
    if (open) loadLinks()
  }, [open, loadLinks])

  useEffect(() => {
    if (showCreateForm) newNameInputRef.current?.focus()
  }, [showCreateForm])

  async function handleToggleDeploy() {
    if (!agent || togglingDeploy) return
    const next: 'live' | 'idle' = isDeployed ? 'idle' : 'live'
    setTogglingDeploy(true)
    try {
      const updated = await toggleAgentStatus(token, agent.id, next)
      onAgentUpdate(updated)
    } catch { /* silent */ } finally {
      setTogglingDeploy(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed || !agent) return
    setCreating(true)
    try {
      const created = await createAccessLink(token, agent.id, trimmed)
      setLinks(prev => [...prev, created])
      setNewName('')
      setShowCreateForm(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create link.')
    } finally {
      setCreating(false)
    }
  }

  function copyTestUrl() {
    navigator.clipboard.writeText(testUrl).then(() => {
      setCopiedTest(true)
      setTimeout(() => setCopiedTest(false), 2000)
    })
  }

  const defaultLink = links.find(l => l.is_default)
  const labeledLinks = links.filter(l => !l.is_default)

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Access Links"
      subtitle={agent?.agent_display_label || agent?.agent_name}
    >
      <div className="px-6 py-5 flex flex-col gap-4">

        {/* ── Deploy toggle ── */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-all duration-[120ms] ${
          isDeployed
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isDeployed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <div>
              <p className={`text-sm font-semibold ${isDeployed ? 'text-emerald-800' : 'text-gray-600'}`}>
                {isDeployed ? 'Agent deployed' : 'Agent not deployed'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isDeployed ? 'Live sessions are open.' : 'Live links are inactive until deployed.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleDeploy}
            disabled={togglingDeploy}
            className="group flex items-center p-1 rounded-lg hover:bg-white/60 disabled:opacity-50 duration-[120ms] shrink-0"
          >
            {togglingDeploy ? (
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            ) : isDeployed ? (
              <ToggleRight className="w-8 h-8 text-emerald-500 group-hover:text-emerald-600 duration-[120ms]" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-300 group-hover:text-indigo-600 duration-[120ms]" />
            )}
          </button>
        </div>

        {/* ── Test link (always works) ── */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-700">Test link</span>
            <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-medium">Always works</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-1 min-w-0 text-xs text-gray-400 truncate font-mono">{testUrl}</span>
            <button
              onClick={copyTestUrl}
              className="shrink-0 p-1 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-100 duration-[120ms]"
            >
              {copiedTest ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Link list ── */}
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* Not-deployed banner */}
            {!isDeployed && links.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">
                  Deploy the agent above to enable live sessions on these links.
                </p>
              </div>
            )}

            {/* Default link */}
            {defaultLink && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Default</p>
                <LinkRow
                  link={defaultLink}
                  muted={!isDeployed}
                  token={token}
                  onUpdate={updated => setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))}
                  onDelete={id => setLinks(prev => prev.filter(l => l.id !== id))}
                />
              </div>
            )}

            {/* Labeled links */}
            {labeledLinks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Labeled</p>
                <div className="flex flex-col gap-2.5">
                  {labeledLinks.map(link => (
                    <LinkRow
                      key={link.id}
                      link={link}
                      muted={!isDeployed}
                      token={token}
                      onUpdate={updated => setLinks(prev => prev.map(l => l.id === updated.id ? updated : l))}
                      onDelete={id => setLinks(prev => prev.filter(l => l.id !== id))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Create form */}
            <AnimatePresence>
              {showCreateForm && (
                <motion.form
                  onSubmit={handleCreate}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={newNameInputRef}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setShowCreateForm(false); setNewName('') }
                    }}
                    placeholder="Link name (e.g. Batch A)"
                    disabled={creating}
                    className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 disabled:opacity-50 duration-[120ms]"
                  />
                  <button
                    type="submit"
                    disabled={!newName.trim() || creating}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed duration-[120ms] shrink-0"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setNewName('') }}
                    disabled={creating}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg duration-[120ms] shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 duration-[120ms]"
              >
                <Plus className="w-4 h-4" />
                Add labeled link
              </button>
            )}
          </>
        )}
      </div>
    </SlidePanel>
  )
}
