import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import {
  fetchAgentSpaceMembers,
  changeAgentSpaceMemberRole,
  removeAgentSpaceMember,
} from '../../lib/api'
import type { AgentSpaceMember } from '../../lib/api'
import SlidePanel from './SlidePanel'

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
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {member.name || member.email}
          {isSelf && <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>}
        </p>
        {member.name && <p className="text-xs text-gray-400 truncate">{member.email}</p>}
      </div>
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

interface Props {
  open: boolean
  onClose: () => void
}

export default function MembersPanel({ open, onClose }: Props) {
  const { session } = useAuth()
  const { activeSpace } = useAgentSpace()
  const [members, setMembers] = useState<AgentSpaceMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = session?.access_token
  const spaceId = activeSpace?.id
  const currentUserId = session?.user?.id

  useEffect(() => {
    if (!open || !token || !spaceId) return
    setLoading(true)
    setError(null)
    fetchAgentSpaceMembers(token, spaceId)
      .then(setMembers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open, token, spaceId])

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

  return (
    <SlidePanel open={open} onClose={onClose} title="Members" subtitle={activeSpace?.name}>
      <div className="px-6 py-4">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
        )}
        {error && <p className="text-sm text-red-500 py-4">{error}</p>}
        {!loading && !error && (
          <>
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
              <p className="text-sm text-gray-400 py-4 text-center">No members found.</p>
            )}
          </>
        )}
      </div>
    </SlidePanel>
  )
}
