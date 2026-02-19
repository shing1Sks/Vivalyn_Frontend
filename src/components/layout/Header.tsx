import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, LogOut, Orbit } from 'lucide-react'
import Logo from '../ui/Logo'
import Button from '../ui/Button'
import UserAvatar from '../ui/UserAvatar'
import { NAV_LINKS } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../context/ProfileContext'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, loading, signOut } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  async function handleSignOut() {
    setDropdownOpen(false)
    setMobileOpen(false)
    await signOut()
    navigate('/')
  }

  // Prepend "/" to anchor links if not on landing page
  function navHref(href: string) {
    if (location.pathname === '/') return href
    return '/' + href
  }

  return (
    <header className="h-[72px] sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-full">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          <Logo />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={navHref(link.href)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-[120ms]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity duration-[120ms] block"
              >
                <UserAvatar size="sm" email={user?.email ?? ''} profile={profile} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-md p-3 space-y-2">
                  <p className="text-sm text-gray-500 truncate px-2">{user.email}</p>
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/agent-space') }}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                  >
                    <Orbit className="w-4 h-4" />
                    Agent Space
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-[120ms] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button variant="primary" onClick={() => navigate('/auth')}>
              Sign in
            </Button>
          )}
        </div>

        <button
          className="md:hidden p-2 text-gray-700 cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={navHref(link.href)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {loading ? null : user ? (
              <>
                <p className="text-sm text-gray-500 truncate mt-2">{user.email}</p>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/agent-space') }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <Orbit className="w-4 h-4" />
                  Agent Space
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              <Button
                variant="primary"
                className="mt-2 w-full"
                onClick={() => { setMobileOpen(false); navigate('/auth') }}
              >
                Sign in
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
