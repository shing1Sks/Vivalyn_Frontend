import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import { useAgentSpace } from '../../context/AgentSpaceContext'
import UserAvatar from '../ui/UserAvatar'
import AgentSpaceSwitcher from './AgentSpaceSwitcher'
import { usePendingInviteCount } from './InboxPanel'

interface AgentSpaceHeaderProps {
  onSignOut: () => void
  onCreateSpaceClick: () => void
  onSettingsClick: () => void
  onInboxClick: () => void
}

export default function AgentSpaceHeader({
  onSignOut,
  onCreateSpaceClick,
  onSettingsClick,
  onInboxClick,
}: AgentSpaceHeaderProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { activeSpace } = useAgentSpace()
  const navigate = useNavigate()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pendingCount = usePendingInviteCount()

  const isAdmin = activeSpace?.role === 'admin'

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
      <div className="px-5 flex items-center justify-between h-full">
        {/* Left: Logo + Switcher */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-120 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <img src="./icon.png" alt="" className="w-full h-full object-cover" />
            </div>
            <span className="text-[15px] font-semibold text-gray-900">Vivalyn</span>
          </button>

          <span className="text-gray-300 text-lg select-none">/</span>

          <AgentSpaceSwitcher onCreateClick={onCreateSpaceClick} />
        </div>

        {/* Right: Inbox + Settings + Avatar */}
        <div className="flex items-center gap-1.5">
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

          {/* Settings (admin only) */}
          {isAdmin ? (
            <button
              onClick={onSettingsClick}
              title="Settings"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-[120ms] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              title="Settings (admin only)"
              className="p-2 text-gray-400 rounded-lg opacity-40 cursor-not-allowed"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

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
                <p className="text-xs text-gray-400 truncate px-2 pb-1 pt-0.5">
                  {user?.email}
                </p>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    onSignOut()
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-120 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
