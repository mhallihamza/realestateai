'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import NotificationBell from '@/components/layout/NotificationBell'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/automation': 'Automation',
  '/integrations': 'Integrations',
  '/team': 'Team',
  '/billing': 'Billing',
  '/settings': 'Settings',
}

export default function TopBar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const user = session?.user as { id?: string; name?: string; email?: string } | undefined

  const getTitle = () => {
    if (titles[pathname]) return titles[pathname]
    if (pathname.startsWith('/leads/')) return 'Lead Details'
    return 'Dashboard'
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-xl font-semibold text-gray-900">{getTitle()}</h1>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.name || 'Agent'}
          </span>
        </div>
      </div>
    </header>
  )
}
