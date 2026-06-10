'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { Upload, FileText, Check, X } from 'lucide-react'

interface CSVRow {
  name?: string
  email?: string
  phone?: string
  source?: string
  propertyType?: string
  property_type?: string
  budget?: string
  locationPreference?: string
  location_preference?: string
  notes?: string
  status?: string
}

interface ParsedLead {
  name: string
  email: string
  phone: string
  source: string
  propertyType: string
  budget: string
  locationPreference: string
  notes: string
  status: string
}

interface CSVImportProps {
  onClose: () => void
}

export default function CSVImport({ onClose }: CSVImportProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedLead[]>([])
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const leads = results.data
          .filter((row) => row.name && row.email)
          .map((row) => ({
            name: row.name || '',
            email: row.email || '',
            phone: row.phone || '',
            source: row.source || 'Other',
            propertyType: row.propertyType || row.property_type || '',
            budget: row.budget || '',
            locationPreference: row.locationPreference || row.location_preference || '',
            notes: row.notes || '',
            status: row.status || 'New',
          }))
        setParsed(leads)
        if (leads.length === 0) {
          toast.error('No valid leads found. Make sure CSV has "name" and "email" columns.')
        }
      },
      error: () => {
        toast.error('Failed to parse CSV file')
      },
    })
  }

  async function handleImport() {
    if (parsed.length === 0) return
    setLoading(true)

    try {
      const res = await fetch('/api/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsed }),
      })

      if (!res.ok) throw new Error('Import failed')

      const data = await res.json()
      toast.success(`Successfully imported ${data.count} leads!`)
      router.refresh()
      onClose()
    } catch {
      toast.error('Failed to import leads')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">CSV Format</p>
        <p className="text-blue-600">Required columns: <code className="bg-blue-100 px-1 rounded">name</code>, <code className="bg-blue-100 px-1 rounded">email</code></p>
        <p className="text-blue-600 mt-1">Optional: phone, source, property_type, budget, location_preference, notes, status</p>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{fileName}</p>
              <p className="text-sm text-gray-500">{parsed.length} leads found</p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Click to upload CSV file</p>
            <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      {parsed.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Preview ({Math.min(parsed.length, 3)} of {parsed.length})</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsed.slice(0, 3).map((lead, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{lead.name}</td>
                    <td className="px-4 py-2 text-gray-600">{lead.email}</td>
                    <td className="px-4 py-2 text-gray-600">{lead.source}</td>
                    <td className="px-4 py-2 text-gray-600">{lead.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          loading={loading}
          disabled={parsed.length === 0}
        >
          <Check className="w-4 h-4" />
          Import {parsed.length} Leads
        </Button>
      </div>
    </div>
  )
}
