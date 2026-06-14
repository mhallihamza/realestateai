import Link from 'next/link'
import { Building2, Zap, TrendingUp, Mail, CheckCircle, ArrowRight, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">RealEstate AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">How it works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign in</Link>
            <Link href="/register" className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      <section className="gradient-hero pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-white/20">
              <Zap className="w-4 h-4" />
              AI Sales Agent for Real Estate
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
              Turn More Leads Into{' '}
              <span className="text-blue-300">Property Viewings</span>
              {' '}— 24/7
            </h1>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl">
              An AI sales employee that captures leads, responds instantly, qualifies prospects,
              and follows up automatically — so you close more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-lg text-lg">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-lg">
                See How It Works
              </a>
            </div>
            <div className="flex items-center gap-6 mt-10">
              <div className="flex -space-x-2">
                {['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-yellow-400'].map((color, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white`} />
                ))}
              </div>
              <p className="text-blue-200 text-sm">
                <span className="text-white font-semibold">500+ agents</span> already using RealEstate AI
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500 font-medium mb-8">TRUSTED BY AGENTS AT</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-40">
            {['Century 21', 'Keller Williams', 'RE/MAX', 'Coldwell Banker', 'Sotheby\'s'].map((name) => (
              <span key={name} className="text-gray-700 font-bold text-xl">{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to close more deals</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Built specifically for real estate agents who want to spend less time chasing and more time closing.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-7 h-7 text-blue-600" />,
                title: 'AI Sales Agent',
                desc: 'Responds to leads in seconds across email, SMS, and WhatsApp. Qualifies prospects and books viewings automatically.',
                color: 'bg-blue-50',
              },
              {
                icon: <TrendingUp className="w-7 h-7 text-green-600" />,
                title: 'Smart Lead Scoring',
                desc: 'Real-time scoring from opens, clicks, and replies. Get alerted when a lead goes hot — before they go cold.',
                color: 'bg-green-50',
              },
              {
                icon: <Mail className="w-7 h-7 text-purple-600" />,
                title: 'Autonomous Follow-Ups',
                desc: 'AI-generated follow-up sequences at day 0, 2, 5, 10, and 21. Edit, approve, or regenerate any message.',
                color: 'bg-purple-50',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-8 card-shadow-lg border border-gray-100 hover:border-blue-200 transition-colors">
                <div className={`w-14 h-14 ${f.color} rounded-xl flex items-center justify-center mb-6`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-xl text-gray-600">Three simple steps to never lose a lead again.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Capture Leads', desc: 'Import CSV, connect Facebook Lead Ads, or receive leads via webhook from your website forms.' },
              { step: '02', title: 'AI Qualifies & Responds', desc: 'Your AI agent responds instantly, asks qualifying questions, and remembers every conversation.' },
              { step: '03', title: 'Book Viewings & Close', desc: 'Hot leads get flagged. You take over when ready. AI handles the rest — 24/7.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-8xl font-black text-blue-100 leading-none mb-4">{s.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What agents are saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Sarah K.', role: 'Senior Agent, Dubai', text: 'I used to lose leads after 2 days. Now my AI follows up automatically and I\'m booking 3x more viewings.' },
              { name: 'Marcus T.', role: 'Agency Owner, London', text: 'The hot lead detection is incredible. Got a notification, called the client within 5 minutes, and closed a deal.' },
              { name: 'Fatima A.', role: 'Real Estate Broker, UAE', text: 'The AI messages sound exactly like me. My clients don\'t even realize it\'s automated. Absolutely love it.' },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-8 card-shadow-lg border border-gray-100">
                <div className="flex mb-4">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-600">Start free. Scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl p-8 card-shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-gray-900">$49</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['500 leads/mo', 'Email + SMS', 'AI follow-up sequences', 'Hot lead alerts', '1 CRM integration'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center w-full border-2 border-blue-600 text-blue-600 font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors">
                Start Free Trial
              </Link>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-white">$149</span>
                <span className="text-blue-200">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['5,000 leads/mo', 'WhatsApp + SMS + Email', 'Autonomous AI agent', 'Human handoff', 'Advanced analytics'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-200 flex-shrink-0" />
                    <span className="text-blue-100">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center w-full bg-white text-blue-600 font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors">
                Start Free Trial
              </Link>
            </div>
            <div className="bg-white rounded-2xl p-8 card-shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Agency</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-gray-900">$499</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited leads', 'All channels + integrations', 'Team collaboration', 'Priority support', 'Custom AI training'].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 gradient-hero">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to close more deals?</h2>
          <p className="text-xl text-blue-100 mb-10">Join hundreds of agents using AI to turn cold leads into property viewings.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-xl text-lg">
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 gradient-brand rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">RealEstate AI</span>
          </div>
          <p className="text-sm">© 2025 RealEstate AI. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
