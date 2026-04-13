import { BarChart2, CreditCard, LayoutDashboard, LogOut, MessageSquare, Tag, TrendingDown } from 'lucide-react'

export type AdminSection = 'home' | 'analytics' | 'inquiries' | 'subscriptions' | 'discounts' | 'retention'

interface AdminSidebarProps {
  activeSection: AdminSection
  onNavigate: (section: AdminSection) => void
  onSignOut: () => void
}

const NAV_ITEMS: { label: string; icon: React.ComponentType<{ className?: string }>; key: AdminSection }[] = [
  { label: 'Home', icon: LayoutDashboard, key: 'home' },
  { label: 'Analytics', icon: BarChart2, key: 'analytics' },
  { label: 'Inquiries', icon: MessageSquare, key: 'inquiries' },
  { label: 'Subscriptions', icon: CreditCard, key: 'subscriptions' },
  { label: 'Retention', icon: TrendingDown, key: 'retention' },
  { label: 'Discounts', icon: Tag, key: 'discounts' },
]

export default function AdminSidebar({ activeSection, onNavigate, onSignOut }: AdminSidebarProps) {
  return (
    <aside className="w-55 h-screen fixed left-0 top-0 flex flex-col bg-white border-r border-gray-200 z-30">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Admin</p>
        <p className="text-[15px] font-semibold text-gray-900 mt-0.5">Vivalyn</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, key }) => {
          const isActive = activeSection === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4 border-t border-gray-100 pt-3">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-[120ms] cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
