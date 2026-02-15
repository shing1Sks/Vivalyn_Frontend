import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Logo from '../ui/Logo'
import Button from '../ui/Button'
import { NAV_LINKS } from '../../lib/constants'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="h-[72px] sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-full">
        <Logo />

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-[120ms]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button variant="primary">Book a demo</Button>
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
                href={link.href}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button variant="primary" className="mt-2 w-full">
              Book a demo
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
