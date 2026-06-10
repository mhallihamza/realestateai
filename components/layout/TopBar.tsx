'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
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
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

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
