'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { LEAD_SOURCES, LEAD_STATUSES } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadFormProps {
  lead?: Partial<Lead>
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  source: 'Other',
  propertyType: '',
  budget: '',
  locationPreference: '',
  notes: '',
  status: 'New',
}

export default function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: lead?.name || defaultForm.name,
    email: lead?.email || defaultForm.email,
    phone: lead?.phone || defaultForm.phone,
    source: lead?.source || defaultForm.source,
    propertyType: lead?.propertyType || defaultForm.propertyType,
    budget: lead?.budget || defaultForm.budget,
    locationPreference: lead?.locationPreference || defaultForm.locationPreference,
    notes: lead?.notes || defaultForm.notes,
    status: lead?.status || defaultForm.status,
  })
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const isEdit = !!lead?.id
      const res = await fetch(isEdit ? `/api/leads/${lead.id}` : '/api/leads', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save lead')
      }

      toast.success(isEdit ? 'Lead updated!' : 'Lead added!')
      router.refresh()
      onSuccess?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} placeholder="John Smith" />
        </div>
        <div>
          <label className={labelClass}>Email Address *</label>
          <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="john@example.com" />
        </div>
        <div>
          <label className={labelClass}>Phone Number</label>
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="+1 555 0123" />
        </div>
        <div>
          <label className={labelClass}>Lead Source</label>
          <select value={form.source} onChange={(e) => update('source', e.target.value)} className={inputClass}>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Property Type</label>
          <input value={form.propertyType} onChange={(e) => update('propertyType', e.target.value)} className={inputClass} placeholder="Apartment, Villa, Office..." />
        </div>
        <div>
          <label className={labelClass}>Budget</label>
          <input value={form.budget} onChange={(e) => update('budget', e.target.value)} className={inputClass} placeholder="$500,000 - $700,000" />
        </div>
        <div>
          <label className={labelClass}>Location Preference</label>
          <input value={form.locationPreference} onChange={(e) => update('locationPreference', e.target.value)} className={inputClass} placeholder="Downtown, Marina, etc." />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputClass}>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="Any additional notes about this lead..."
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {lead?.id ? 'Update Lead' : 'Add Lead'}
        </Button>
      </div>
    </form>
  )
}
