import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, ChevronDown, Trash2, Send, Clock, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, CreditCard, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import { useTokenBalance } from '../../context/TokenContext'
import {
  fetchAgentSpaceMembers,
  fetchAgentSpaceInvites,
  createInvite,
  revokeInvite,
  changeAgentSpaceMemberRole,
  removeAgentSpaceMember,
  fetchTokenTransactions,
  fetchAgentspaceSubscription,
} from '../../lib/api'
import type { AgentSpaceMember, Invite, TokenTransaction, AgentspaceSubscription } from '../../lib/api'
import InquiryModal from '../ui/InquiryModal'

type Tab = 'members' | 'invites' | 'plan'

interface Props {
  open: boolean
  onClose: () => void
}

function MemberRow({
  member,
  isSelf,
  onChangeRole,
  onRemove,
}: {
  member: AgentSpaceMember
  isSelf: boolean
  onChangeRole: (userId: string, role: string) => void
  onRemove: (userId: string) => void
}) {
  const [roleOpen, setRoleOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setRoleOpen(false)
    }
    if (roleOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [roleOpen])

  const initial = (member.name || member.email).charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Avatar */}
      {member.profile_pic_link ? (
        <img
          src={member.profile_pic_link}
          alt={member.email}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
          style={{ background: member.profile_pic_gradient ?? 'linear-gradient(135deg, hsl(230,65%,78%), hsl(270,65%,82%))' }}
        >
          {initial}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {member.name || member.email}
          {isSelf && <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>}
        </p>
        {member.name && (
          <p className="text-xs text-gray-400 truncate">{member.email}</p>
        )}
      </div>

      {/* Role badge / dropdown */}
      {isSelf ? (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${member.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
          {member.role === 'admin' ? 'Admin' : 'Member'}
        </span>
      ) : (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors duration-[120ms] cursor-pointer"
          >
            {member.role === 'admin' ? 'Admin' : 'Member'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {roleOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl border border-gray-200 shadow-md p-1 z-50">
              {(['admin', 'member'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { onChangeRole(member.user_id, r); setRoleOpen(false) }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors duration-[120ms] cursor-pointer ${member.role === r ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {r === 'admin' ? 'Admin' : 'Member'}
                </button>
              ))}
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => { onRemove(member.user_id); setRoleOpen(false) }}
                className="w-full text-left text-sm px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-[120ms] cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InviteRow({ invite, onRevoke }: { invite: Invite; onRevoke: (id: string) => void }) {
  const statusBadge = () => {
    if (invite.is_expired && invite.status === 'pending') {
      return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700"><Clock className="w-3 h-3" />Expired</span>
    }
    if (invite.status === 'accepted') return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Accepted</span>
    if (invite.status === 'revoked') return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Revoked</span>
    return <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">Pending</span>
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{invite.invited_email}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {invite.role === 'admin' ? 'Admin' : 'Member'} · Sent {new Date(invite.created_at).toLocaleDateString()}
        </p>
      </div>
      {statusBadge()}
      {invite.status === 'pending' && !invite.is_expired && (
        <button
          onClick={() => onRevoke(invite.id)}
          title="Revoke invite"
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-[120ms] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    expired: 'bg-amber-50 text-amber-700',
    inactive: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function AgentSpaceSettingsPanel({ open, onClose }: Props) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()

  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<AgentSpaceMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [invitesError, setInvitesError] = useState<string | null>(null)

  // Plan tab state
  const [subscription, setSubscription] = useState<AgentspaceSubscription | null>(null)
  const [subLoading, setSubLoading] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [txTotal, setTxTotal] = useState(0)
  const [txPage, setTxPage] = useState(1)
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const { balance, lowThreshold } = useTokenBalance()
  const TX_PAGE_SIZE = 20

  // New invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSendError, setInviteSendError] = useState<string | null>(null)
  const [inviteSentOk, setInviteSentOk] = useState(false)

  const token = session?.access_token
  const spaceId = activeSpace?.id
  const isAdmin = activeSpace?.role === 'admin'

  useEffect(() => {
    if (!open || !token || !spaceId) return

    setMembersLoading(true)
    setMembersError(null)
    fetchAgentSpaceMembers(token, spaceId)
      .then(setMembers)
      .catch((e: Error) => setMembersError(e.message))
      .finally(() => setMembersLoading(false))
  }, [open, token, spaceId])

  useEffect(() => {
    if (!open || tab !== 'plan' || !token || !spaceId) return
    setSubLoading(true)
    setSubError(null)
    fetchAgentspaceSubscription(token, spaceId)
      .then(setSubscription)
      .catch((e: Error) => setSubError(e.message))
      .finally(() => setSubLoading(false))
  }, [open, tab, token, spaceId])

  useEffect(() => {
    if (!open || tab !== 'plan' || !token || !spaceId) return
    setTxLoading(true)
    setTxError(null)
    fetchTokenTransactions(token, spaceId, txPage, TX_PAGE_SIZE)
      .then((res) => { setTransactions(res.transactions); setTxTotal(res.total) })
      .catch((e: Error) => setTxError(e.message))
      .finally(() => setTxLoading(false))
  }, [open, tab, token, spaceId, txPage])

  useEffect(() => {
    if (!open || tab !== 'invites' || !token || !spaceId) return

    setInvitesLoading(true)
    setInvitesError(null)
    fetchAgentSpaceInvites(token, spaceId)
      .then(setInvites)
      .catch((e: Error) => setInvitesError(e.message))
      .finally(() => setInvitesLoading(false))
  }, [open, tab, token, spaceId])

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !spaceId) return
    setInviteSending(true)
    setInviteSendError(null)
    setInviteSentOk(false)
    try {
      const newInvite = await createInvite(token, spaceId, inviteEmail.trim().toLowerCase(), inviteRole)
      setInvites((prev) => [newInvite, ...prev])
      setInviteEmail('')
      setInviteSentOk(true)
      setTimeout(() => setInviteSentOk(false), 3000)
    } catch (e) {
      setInviteSendError(e instanceof Error ? e.message : 'Failed to send invite')
    } finally {
      setInviteSending(false)
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!token || !spaceId) return
    try {
      await revokeInvite(token, spaceId, inviteId)
      setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, status: 'revoked' } : i))
    } catch (e) {
      console.error('[ERROR] revoke invite:', e)
    }
  }

  async function handleChangeRole(userId: string, role: string) {
    if (!token || !spaceId) return
    try {
      await changeAgentSpaceMemberRole(token, spaceId, userId, role)
      setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role } : m))
    } catch (e) {
      console.error('[ERROR] change role:', e)
    }
  }

  async function handleRemove(userId: string) {
    if (!token || !spaceId) return
    try {
      await removeAgentSpaceMember(token, spaceId, userId)
      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } catch (e) {
      console.error('[ERROR] remove member:', e)
    }
  }

  const currentUserId = session?.user?.id

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed top-0 right-0 h-full w-full max-w-[440px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900">Settings</h2>
                  {activeSpace && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{activeSpace.name}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mx-6 mt-4 mb-2 bg-gray-100 rounded-lg p-1">
                {(['members', 'invites', 'plan'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-[120ms] cursor-pointer capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-2">

                {/* Members tab */}
                {tab === 'members' && (
                  <>
                    {membersLoading && (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      </div>
                    )}
                    {membersError && (
                      <p className="text-sm text-red-500 py-4">{membersError}</p>
                    )}
                    {!membersLoading && !membersError && (
                      <div>
                        {members.map((m) => (
                          <MemberRow
                            key={m.user_id}
                            member={m}
                            isSelf={m.user_id === currentUserId}
                            onChangeRole={handleChangeRole}
                            onRemove={handleRemove}
                          />
                        ))}
                        {members.length === 0 && (
                          <p className="text-sm text-gray-400 py-6 text-center">No members found.</p>
                        )}
                        <button
                          onClick={() => setTab('invites')}
                          className="mt-4 flex items-center gap-2 w-full py-2.5 px-3 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors duration-[120ms]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Invite a member
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Plan tab */}
                {tab === 'plan' && (
                  <div className="pt-2 space-y-5">
                    {subLoading && (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      </div>
                    )}
                    {subError && (
                      <div className="flex items-center gap-2 text-sm text-red-500 py-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {subError}
                      </div>
                    )}
                    {!subLoading && !subError && (
                      <>
                        {/* Subscription info card */}
                        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-xs font-medium text-gray-500">Current Plan</span>
                          </div>
                          {subscription && subscription.has_subscription ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-900 capitalize">
                                  {subscription.plan_tier}
                                  {subscription.scaling_enabled && (
                                    <span className="ml-1.5 text-xs font-normal text-indigo-600">+ Scaling</span>
                                  )}
                                </span>
                                {statusBadge(subscription.status)}
                              </div>
                              {subscription.period_start && subscription.period_end && (
                                <p className="text-xs text-gray-400">
                                  {new Date(subscription.period_start).toLocaleDateString()} — {new Date(subscription.period_end).toLocaleDateString()}
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                                  <p className="text-xs text-gray-400 mb-0.5">Minutes included</p>
                                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{subscription.minutes_included.toLocaleString()}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                                  <p className="text-xs text-gray-400 mb-0.5">Balance remaining</p>
                                  <p className={`text-sm font-semibold tabular-nums ${balance !== null && balance <= lowThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                                    {balance !== null ? balance.toLocaleString() : '—'}
                                  </p>
                                </div>
                              </div>
                              {subscription.plan_tier === 'pro' && subscription.scaling_enabled && (
                                <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-2.5">
                                  <p className="text-xs text-gray-500 mb-0.5">Overflow this period</p>
                                  <p className="text-sm font-semibold text-indigo-700 tabular-nums">
                                    {subscription.overflow_minutes.toLocaleString()} min
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">Overflow is billed at end of month</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-400 py-2">No active plan on this workspace.</p>
                          )}
                        </div>

                        {/* Contact us link — admin only */}
                        {isAdmin && (
                          <button
                            onClick={() => setContactOpen(true)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-[120ms]"
                          >
                            Contact us to change plan →
                          </button>
                        )}

                        <div className="h-px bg-gray-100" />

                        {/* Transaction history */}
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-3">Transaction history</p>
                          {txLoading && (
                            <div className="flex justify-center py-6">
                              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                            </div>
                          )}
                          {txError && <p className="text-sm text-red-500">{txError}</p>}
                          {!txLoading && !txError && (
                            <>
                              {transactions.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4 text-center">No transactions yet.</p>
                              ) : (
                                <div>
                                  {transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${tx.delta > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                        {tx.delta > 0
                                          ? <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                          : <ArrowDownLeft className="w-3 h-3 text-red-500" />
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-700 capitalize">
                                          {tx.reason.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {new Date(tx.created_at).toLocaleDateString()} · bal: {tx.balance_after}
                                        </p>
                                      </div>
                                      <span className={`text-sm font-semibold tabular-nums ${tx.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {tx.delta > 0 ? '+' : ''}{tx.delta}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Pagination */}
                              {Math.ceil(txTotal / TX_PAGE_SIZE) > 1 && (
                                <div className="flex items-center justify-between pt-3">
                                  <span className="text-xs text-gray-400">
                                    Page {txPage} of {Math.ceil(txTotal / TX_PAGE_SIZE)}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                                      disabled={txPage === 1}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                                    >
                                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => setTxPage((p) => Math.min(Math.ceil(txTotal / TX_PAGE_SIZE), p + 1))}
                                      disabled={txPage === Math.ceil(txTotal / TX_PAGE_SIZE)}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[120ms]"
                                    >
                                      <ChevronRight className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Invites tab */}
                {tab === 'invites' && (
                  <>
                    {/* Send invite form */}
                    <form onSubmit={handleSendInvite} className="mb-5 pt-2">
                      <p className="text-xs font-medium text-gray-700 mb-3">Send an invite</p>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        required
                        disabled={inviteSending}
                        className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-[120ms] disabled:opacity-50 mb-2"
                      />
                      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-2">
                        {(['member', 'admin'] as const).map(r => (
                          <button
                            key={r}
                            type="button"
                            disabled={inviteSending}
                            onClick={() => setInviteRole(r)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all duration-[120ms] disabled:opacity-50 ${
                              inviteRole === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {r === 'admin' ? 'Admin' : 'Member'}
                          </button>
                        ))}
                      </div>
                      {inviteSendError && (
                        <p className="text-xs text-red-500 mb-2">{inviteSendError}</p>
                      )}
                      {inviteSentOk && (
                        <p className="text-xs text-emerald-600 mb-2">Invite sent successfully!</p>
                      )}
                      <button
                        type="submit"
                        disabled={inviteSending || !inviteEmail.trim()}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors duration-[120ms] cursor-pointer"
                      >
                        {inviteSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send invite
                      </button>
                    </form>

                    <div className="h-px bg-gray-100 mb-4" />

                    {/* Invite list */}
                    {invitesLoading && (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      </div>
                    )}
                    {invitesError && (
                      <p className="text-sm text-red-500">{invitesError}</p>
                    )}
                    {!invitesLoading && !invitesError && (
                      <div>
                        {invites.map((inv) => (
                          <InviteRow key={inv.id} invite={inv} onRevoke={handleRevoke} />
                        ))}
                        {invites.length === 0 && (
                          <p className="text-sm text-gray-400 py-4 text-center">No invites sent yet.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <InquiryModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  )
}
