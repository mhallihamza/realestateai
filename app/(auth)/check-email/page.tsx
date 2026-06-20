'use client'

import { useRouter } from 'next/navigation'
import { Mail, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function CheckEmailPage() {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const email = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('email') 
    : ''

  async function handleResend() {
    if (!email) {
      toast.error('Email not found. Please try registering again.')
      return
    }
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Failed to resend')
      toast.success('Verification email resent! Please check your inbox.')
    } catch {
      toast.error('Failed to resend verification email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600 mt-2">
            We sent a verification link to
          </p>
          <p className="text-gray-900 font-semibold mt-1">
            {email || 'your email'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">1</span>
              </div>
              <p className="text-sm text-gray-700">Open the email we just sent you</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">2</span>
              </div>
              <p className="text-sm text-gray-700">Click the verification link inside</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">3</span>
              </div>
              <p className="text-sm text-gray-700">Your account will be activated automatically</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium">Didn't receive the email?</p>
            <ul className="text-xs text-blue-600 mt-2 space-y-1">
              <li>• Check your spam or promotions folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• The link expires in 24 hours</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 py-2 transition-colors disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend verification email'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}