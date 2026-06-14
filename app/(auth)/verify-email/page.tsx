'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          setStatus('success')
          toast.success('Email verified!')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [token])

  if (status === 'loading') {
    return <p className="text-center text-gray-500">Verifying your email...</p>
  }

  if (status === 'success') {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Email verified!</h2>
        <p className="text-gray-600">Your account is ready. Sign in to start using your AI sales agent.</p>
        <Link href="/login" className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-gray-600">Invalid or expired verification link.</p>
      <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-white text-xl">RealEstate AI</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
