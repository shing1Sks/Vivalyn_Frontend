import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'
import {
  fetchContactEvents,
  updateContactEvent,
  type ContactEvent,
} from '../../lib/api'

const STATUS_OPTIONS = ['new', 'seen', 'replied', 'closed'] as const
type EventStatus = typeof STATUS_OPTIONS[number]

const TYPE_OPTIONS = ['all', 'inquiry', 'support'] as const

const STATUS_COLORS: Record<EventStatus, string> = {
  new:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  seen:    'bg-amber-50 text-amber-700 border-amber-200',
  replied: 'bg-blue-50 text-blue-700 border-blue-200',
  closed:  'bg-gray-100 text-gray-500 border-gray-200',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status as EventStatus] ?? 'bg-gray-100 text-gray-500 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const cls = type === 'support'
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {type}
    </span>
  )
}

export function AdminContactEventsView({ token }: { token: string }) {
  const [events, setEvents] = useState<ContactEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    fetchContactEvents(
      token,
      statusFilter === 'all' ? undefined : statusFilter,
      typeFilter === 'all' ? undefined : typeFilter,
    )
      .then(data => {
        setEvents(data)
        const notes: Record<string, string> = {}
        data.forEach(e => { notes[e.id] = e.notes ?? '' })
        setNotesById(notes)
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [token, statusFilter, typeFilter])

  useEffect(() => {
    if (!statusDropdownId) return
    const handler = () => setStatusDropdownId(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusDropdownId])

  const handleStatusChange = async (ev: ContactEvent, newStatus: string) => {
    setStatusDropdownId(null)
    try {
      const updated = await updateContactEvent(token, ev.id, { status: newStatus })
      setEvents(prev => prev.map(e => e.id === ev.id ? updated : e))
    } catch {
      // silent
    }
  }

  const handleSaveNotes = async (ev: ContactEvent) => {
    setSavingNotes(ev.id)
    try {
      const updated = await updateContactEvent(token, ev.id, { notes: notesById[ev.id] ?? '' })
      setEvents(prev => prev.map(e => e.id === ev.id ? updated : e))
    } catch {
      // silent
    } finally {
      setSavingNotes(null)
    }
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Contact Events</h2>
        <p className="text-sm text-gray-500 mt-0.5">Inquiries and support messages from the site.</p>

        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-[120ms] capitalize cursor-pointer ${
                  statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {TYPE_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-[120ms] capitalize cursor-pointer ${
                  typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No contact events found.</div>
      ) : (
        <div className="rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Message</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(ev => (
                <>
                  <tr
                    key={ev.id}
                    className="hover:bg-gray-50 transition-colors duration-[120ms] cursor-pointer"
                    onClick={() => setExpandedId(prev => prev === ev.id ? null : ev.id)}
                  >
                    <td className="px-4 py-3">
                      <TypeBadge type={ev.type} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{ev.name}</p>
                      <p className="text-xs text-gray-400">{ev.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="text-gray-600 text-xs line-clamp-2">{ev.message}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {ev.source ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onMouseDown={e => { e.stopPropagation(); setStatusDropdownId(prev => prev === ev.id ? null : ev.id) }}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <StatusBadge status={ev.status} />
                          <ChevronDown size={12} className="text-gray-400" />
                        </button>
                        <AnimatePresence>
                          {statusDropdownId === ev.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                              className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[120px]"
                            >
                              {STATUS_OPTIONS.map(s => (
                                <button
                                  key={s}
                                  onMouseDown={e => { e.stopPropagation(); handleStatusChange(ev, s) }}
                                  className={`w-full text-left px-3 py-2 text-xs duration-[120ms] cursor-pointer ${
                                    ev.status === s ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(ev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-[120ms] ${expandedId === ev.id ? 'rotate-180' : ''}`}
                      />
                    </td>
                  </tr>

                  <AnimatePresence>
                    {expandedId === ev.id && (
                      <motion.tr
                        key={`${ev.id}-expanded`}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        <td colSpan={7} className="px-4 pb-4 bg-gray-50 border-b border-gray-100">
                          <div className="pt-3 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Full message</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ev.message}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Internal notes</p>
                              <textarea
                                value={notesById[ev.id] ?? ''}
                                onChange={e => setNotesById(prev => ({ ...prev, [ev.id]: e.target.value }))}
                                placeholder="Add notes..."
                                rows={2}
                                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                onClick={e => e.stopPropagation()}
                              />
                              <button
                                onClick={e => { e.stopPropagation(); handleSaveNotes(ev) }}
                                disabled={savingNotes === ev.id}
                                className="mt-1 px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors duration-[120ms] disabled:opacity-50 cursor-pointer"
                              >
                                {savingNotes === ev.id ? 'Saving...' : 'Save notes'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
