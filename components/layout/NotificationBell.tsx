'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  leadId?: string | null
  readAt?: string | null
  createdAt: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnread((data.notifications || []).filter((n: Notification) => !n.readAt).length)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const es = new EventSource('/api/notifications/stream')
    es.onmessage = () => fetchNotifications()
    return () => es.close()
  }, [fetchNotifications])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    })
    fetchNotifications()
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'readAll' }),
    })
    fetchNotifications()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Notifications</p>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                    onClick={() => { markRead(n.id); setOpen(false) }}
                  >
                    {n.leadId ? (
                      <Link href={`/leads/${n.leadId}`} className="block">
                        <NotificationItem notification={n} />
                      </Link>
                    ) : (
                      <NotificationItem notification={n} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const icon = n.type === 'hot_lead' ? '🔥' : n.type === 'handoff' ? '🤝' : n.type === 'booking' ? '📅' : '💬'
  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="text-sm">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
          <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(n.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}
