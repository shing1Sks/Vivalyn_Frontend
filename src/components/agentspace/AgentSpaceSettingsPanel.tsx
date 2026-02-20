import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, ChevronDown, Trash2, Send, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import {
  fetchAgentSpaceMembers,
  fetchAgentSpaceInvites,
  createInvite,
  revokeInvite,
  changeAgentSpaceMemberRole,
  removeAgentSpaceMember,
} from '../../lib/api'
import type { AgentSpaceMember, Invite } from '../../lib/api'

type Tab = 'members' | 'invites'

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

  // New invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteSendError, setInviteSendError] = useState<string | null>(null)
  const [inviteSentOk, setInviteSentOk] = useState(false)

  const token = session?.access_token
  const spaceId = activeSpace?.id

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
              {(['members', 'invites'] as Tab[]).map((t) => (
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
                    </div>
                  )}
                </>
              )}

              {/* Invites tab */}
              {tab === 'invites' && (
                <>
                  {/* Send invite form */}
                  <form onSubmit={handleSendInvite} className="mb-5 pt-2">
                    <p className="text-xs font-medium text-gray-700 mb-3">Send an invite</p>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        required
                        disabled={inviteSending}
                        className="flex-1 py-2.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600 transition-all duration-[120ms] disabled:opacity-50"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                        disabled={inviteSending}
                        className="py-2.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600 transition-all duration-[120ms] cursor-pointer disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
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
  )
}
