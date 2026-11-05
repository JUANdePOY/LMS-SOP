import { useState } from 'react';
import {
  BookOpen, FileText, ClipboardCheck, Award, Users, BarChart3,
  ArrowRight, CheckCircle2, Shield, Zap, GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Course Management',
    description: 'Build, publish, and track interactive courses with lessons, modules, and assessments.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: FileText,
    title: 'SOP Management',
    description: 'Version-controlled standard operating procedures with approval workflows.',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: ClipboardCheck,
    title: 'Quiz & Assessments',
    description: 'Create quizzes, track attempts, and monitor integrity with detailed analytics.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Award,
    title: 'Certificates',
    description: 'Issue verifiable certificates automatically upon course or SOP completion.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Users,
    title: 'User Management',
    description: 'Role-based access for admins, department heads, and employees.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: BarChart3,
    title: 'Reporting & Analytics',
    description: 'Real-time dashboards for training progress, compliance, and performance.',
    color: 'from-cyan-500 to-sky-500',
  },
];

const STATS = [
  { value: '100%', label: 'Compliance Tracking' },
  { value: '24/7', label: 'Access Anywhere' },
  { value: 'Role-based', label: 'Access Control' },
  { value: 'Audit-ready', label: 'Reports' },
];

const HIGHLIGHTS = [
  'Centralized training & SOP library',
  'Automated certificate issuance',
  'Real-time progress tracking',
  'Secure role-based permissions',
];

export default function HomePage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight">LMS-SOP</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-300 md:flex">
            <a href="#features" className="transition-colors hover:text-orange-500">Features</a>
            <a href="#modules" className="transition-colors hover:text-orange-500">Modules</a>
            <a href="#about" className="transition-colors hover:text-orange-500">About</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 sm:inline-flex"
            >
              Login
            </Link>
            <button
              onClick={() => setMobileMenu((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 md:hidden"
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
            <div className="flex flex-col gap-2 text-sm font-medium">
              <a href="#features" onClick={() => setMobileMenu(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">Features</a>
              <a href="#modules" onClick={() => setMobileMenu(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">Modules</a>
              <a href="#about" onClick={() => setMobileMenu(false)} className="rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">About</a>
              <Link to="/login" onClick={() => setMobileMenu(false)} className="rounded-lg bg-orange-500 px-3 py-2 text-center font-semibold text-white hover:bg-orange-600">Login</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-50 via-white to-indigo-50 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900" />
        <div className="absolute -top-24 -right-24 -z-10 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl dark:bg-orange-500/10" />
        <div className="absolute -bottom-24 -left-24 -z-10 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-500/10" />

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              <Zap size={14} /> Enterprise Learning Platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Train. Comply.{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Excel.
              </span>
            </h1>
            <p className="mt-6 text-base leading-7 text-neutral-600 dark:text-neutral-400 sm:text-lg">
              A unified platform for SOP management, course delivery, assessments, and certification —
              built for organizations that take training seriously.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#features"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-xl sm:w-auto"
              >
                Explore Features <ArrowRight size={18} />
              </a>
              <a
                href="#about"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
              >
                Learn More
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
              {HIGHLIGHTS.map((h) => (
                <span key={h} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" /> {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-extrabold text-orange-500 sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">Features</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything your team needs to learn</h2>
          <p className="mt-4 text-base text-neutral-600 dark:text-neutral-400">
            From onboarding to compliance audits, manage the full learning lifecycle in one place.
          </p>
        </div>

        <div id="modules" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', f.color)}>
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{f.description}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-neutral-50 dark:bg-neutral-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-500">About</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Built for compliance-first organizations</h2>
              <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
                LMS-SOP combines standard operating procedures with structured learning paths, quizzes, and
                certificates — so your team always knows what to do and can prove they know it.
              </p>
              <ul className="mt-6 space-y-3">
                {HIGHLIGHTS.map((h) => (
                  <li key={h} className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                    <Shield size={18} className="text-orange-500" /> {h}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid grid-cols-2 gap-4">
                {FEATURES.slice(0, 4).map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800">
                      <Icon size={20} className="text-orange-500" />
                      <p className="mt-2 text-sm font-semibold">{f.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-6 py-14 text-center text-white shadow-xl sm:px-12">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to transform your training?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-orange-50">
            Sign in to access your personalized learning dashboard and start building compliance-ready teams.
          </p>
          <a
            href="#features"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow-md transition-all hover:bg-orange-50"
          >
            Explore Features <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 dark:text-neutral-400 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <GraduationCap size={14} />
            </div>
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">LMS-SOP</span>
          </div>
          <p>© {new Date().getFullYear()} SOP Training Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-orange-500">Privacy</a>
            <a href="/terms" className="hover:text-orange-500">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
