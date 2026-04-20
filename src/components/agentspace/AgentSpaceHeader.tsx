import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CreditCard, LayoutDashboard, LifeBuoy, LogOut, Receipt, Shield, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import UserAvatar from '../ui/UserAvatar'
import AgentSpaceSwitcher from './AgentSpaceSwitcher'
import TokenBalanceBar from './TokenBalanceBar'
import SupportModal from '../ui/SupportModal'
import { usePendingInviteCount } from './InboxPanel'
import { adminMe } from '../../lib/api'

interface AgentSpaceHeaderProps {
  onSignOut: () => void
  onCreateSpaceClick: () => void
  onMembersClick: () => void
  onInvitesClick: () => void
  onPlanClick: () => void
  onBillingClick: () => void
  onInboxClick: () => void
}

export default function AgentSpaceHeader({
  onSignOut,
  onCreateSpaceClick,
  onMembersClick,
  onInvitesClick,
  onPlanClick,
  onBillingClick,
  onInboxClick,
}: AgentSpaceHeaderProps) {
  const { user, session } = useAuth()
  const { profile } = useProfile()
  const { activeSpace } = useAgentSpace()
  const navigate = useNavigate()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pendingCount = usePendingInviteCount()

  const isSpaceAdmin = activeSpace?.role === 'admin'

  const [isVivalynAdmin, setIsVivalynAdmin] = useState(false)

  useEffect(() => {
    if (!session) return
    const cached = sessionStorage.getItem('vivalyn_is_admin')
    if (cached !== null) {
      setIsVivalynAdmin(cached === 'true')
      return
    }
    adminMe(session.access_token)
      .then(() => { setIsVivalynAdmin(true); sessionStorage.setItem('vivalyn_is_admin', 'true') })
      .catch(() => sessionStorage.setItem('vivalyn_is_admin', 'false'))
  }, [session])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userDropdownOpen])

  return (
    <header className="h-16 sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-3 md:px-5 flex items-center justify-between h-full gap-2">
        {/* Left: Logo + Switcher */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-120 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <img src="./icon.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span className="hidden sm:block text-[15px] font-semibold text-gray-900">Vivalyn</span>
          </button>

          <span className="hidden sm:block text-gray-300 text-lg select-none">/</span>

          <AgentSpaceSwitcher onCreateClick={onCreateSpaceClick} />

          {isSpaceAdmin && (
            <div className="relative group">
              <Shield className="w-3.5 h-3.5 text-indigo-400 cursor-default" />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none duration-[120ms]">
                Admin
              </div>
            </div>
          )}
        </div>

        {/* Right: Inbox + Token + Avatar */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Inbox bell */}
          <button
            onClick={onInboxClick}
            title="Inbox"
            className={`relative p-2 rounded-lg transition-colors duration-[120ms] cursor-pointer ${
              pendingCount > 0
                ? 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </button>

          {/* Token balance — hidden on small screens to avoid overflow */}
          <div className="hidden sm:block">
            <TokenBalanceBar />
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity duration-120 block"
            >
              <UserAvatar size="sm" email={user?.email ?? ''} profile={profile} />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-md p-2 space-y-1">
                {/* User identity */}
                <div className="px-2 pt-0.5 pb-2">
                  {profile?.name && (
                    <p className="text-sm font-medium text-gray-900 truncate">{profile.name}</p>
                  )}
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Workspace management — space admins only */}
                {isSpaceAdmin && (
                  <>
                    <button
                      onClick={() => { setUserDropdownOpen(false); onMembersClick() }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      Members
                    </button>
                    <button
                      onClick={() => { setUserDropdownOpen(false); onInvitesClick() }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invites
                    </button>
                    <button
                      onClick={() => { setUserDropdownOpen(false); onPlanClick() }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      Plan
                    </button>
                    <button
                      onClick={() => { setUserDropdownOpen(false); onBillingClick() }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      Billing
                    </button>
                  </>
                )}

                {isVivalynAdmin && (
                  <button
                    onClick={() => { setUserDropdownOpen(false); navigate('/admin') }}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}

                <div className="h-px bg-gray-100" />

                <button
                  onClick={() => { setUserDropdownOpen(false); setSupportOpen(true) }}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                >
                  <LifeBuoy className="w-4 h-4" />
                  Support
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    onSignOut()
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </header>
  )
}
