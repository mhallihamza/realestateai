'use client'

import { useState, useEffect } from 'react'
import { Users, UserPlus, Trash2, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access except billing' },
  { value: 'agent', label: 'Agent', desc: 'Manage leads and conversations' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
]

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ email: '', name: '', role: 'agent', password: '' })
  const [inviting, setInviting] = useState(false)

  function fetchMembers() {
    fetch('/api/workspace/members')
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Team member added')
      setShowInvite(false)
      setInvite({ email: '', name: '', role: 'agent', password: '' })
      fetchMembers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite member')
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(id: string) {
    if (!confirm('Remove this team member?')) return
    const res = await fetch(`/api/workspace/members?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Member removed')
      fetchMembers()
    } else {
      toast.error('Failed to remove member')
    }
  }

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team</h2>
          <p className="text-sm text-gray-500 mt-1">Manage workspace members and roles</p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 card-shadow overflow-hidden">
        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {member.user?.name?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.user?.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-500">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                  <Shield className="w-3 h-3" />
                  {member.role}
                </span>
                {member.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Invite Team Member
            </h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={invite.name}
                  onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={invite.password}
                  onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${invite.role === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={invite.role === r.value}
                        onChange={() => setInvite({ ...invite, role: r.value })}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-medium text-sm text-gray-900">{r.label}</p>
                        <p className="text-xs text-gray-500">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={inviting} className="flex-1 justify-center">
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
