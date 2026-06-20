'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const verified = searchParams.get('verified')
  const error = searchParams.get('error')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (error) {
      setStatus('error')
      setMessage(decodeURIComponent(error))
      return
    }

    if (verified === 'true') {
      // Token already verified via GET endpoint, just redirect to login
      setStatus('success')
      setMessage('Account verified! Redirecting to login...')
      setTimeout(() => {
        router.push('/login?verified=true')
      }, 1500)
    } else if (token) {
      // Call POST to verify the token
      setStatus('loading')
      fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus('success')
            setMessage('Account verified! Redirecting to login...')
            setTimeout(() => {
              router.push('/login?verified=true')
            }, 1500)
          } else {
            setStatus('error')
            setMessage(data.error || 'Verification failed')
          }
        })
        .catch(() => {
          setStatus('error')
          setMessage('An error occurred. Please try again.')
        })
    } else {
      setStatus('error')
      setMessage('No verification token found. Please check your email link.')
    }
  }, [token, verified, error, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center">
        {status === 'loading' && (
          <div>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900">Verifying your email...</h1>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
            <p className="text-gray-600 mt-2">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Verification failed</h1>
            <p className="text-gray-600 mt-2">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-200 text-center">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900">Loading...</h1>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}