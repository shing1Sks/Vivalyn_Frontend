import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'
import UserAvatar from '../ui/UserAvatar'
import AgentSpaceSwitcher from './AgentSpaceSwitcher'

interface AgentSpaceHeaderProps {
  onSignOut: () => void
  onCreateSpaceClick: () => void
}

export default function AgentSpaceHeader({
  onSignOut,
  onCreateSpaceClick,
}: AgentSpaceHeaderProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

        {/* Right: Settings + Avatar */}
        <div className="flex items-center gap-1.5">
          <button
            disabled
            title="Settings (coming soon)"
            className="p-2 text-gray-400 rounded-lg opacity-40 cursor-not-allowed"
          >
            <Settings className="w-4 h-4" />
          </button>

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
