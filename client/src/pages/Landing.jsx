import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getTrainings, getExternalTrainings } from '@/services/trainingsService';
import { Calendar, MapPin, Users, ClipboardList, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

function shortDate(value) {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString();
}

function commaList(items = []) {
  return items.filter(Boolean).join(', ');
}

function InternalTrainingCard({ training, onLogin }) {
  const participantCount = training.participants?.length ?? training.participant_groups?.reduce((sum, group) => sum + (group.selectedReservists?.length || 0), 0) ?? 0;
  const participantLabels = training.participants?.slice(0, 4).map((participant) => participant.name || participant.username || participant.email) || [];

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.title || 'Untitled internal training'}</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{training.location || training.venue || 'Location not set'}</p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Internal</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(training.start_datetime || training.start_date)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Participants</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{participantCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Activities</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.activities?.length ?? 0}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <Users className="text-indigo-500" size={16} />
          <span>{participantCount > 0 ? `${participantCount} participant${participantCount !== 1 ? 's' : ''}` : 'No participants yet'}</span>
        </div>
        {participantLabels.length > 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{commaList(participantLabels)}{participantCount > participantLabels.length ? ` +${participantCount - participantLabels.length} more` : ''}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onLogin}>
          Sign in for full details
        </Button>
      </div>
    </div>
  );
}

function ExternalTrainingCard({ training, onRegister }) {
  const squadronCount = training.squadron_limits?.length ?? training.squadronLimits?.length ?? 0;
  const registrationFields = training.registration_fields?.length ?? 0;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{training.title || 'Untitled external event'}</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{training.location || training.venue || 'Location not set'}</p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">External</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Starts</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{shortDate(training.start_datetime || training.start_date)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Squadrons</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{squadronCount}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">Registration</p>
          <p className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{registrationFields ? `${registrationFields} field${registrationFields !== 1 ? 's' : ''}` : 'Login required'}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-violet-500" size={16} />
          <span>{training.status ? training.status.charAt(0).toUpperCase() + training.status.slice(1) : 'Status unavailable'}</span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardList className="text-indigo-500" size={16} />
          <span>{registrationFields > 0 ? 'Registration form configured' : 'Registration requires login'}</span>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="default" size="sm" onClick={onRegister}>
          Login to register
        </Button>
      </div>
    </div>
  );
}

function Carousel({ slides = [], interval = 6000 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length <= 1) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => clearInterval(id);
  }, [slides, interval]);

  const goTo = (i) => setIndex(((i % slides.length) + slides.length) % slides.length);

  return (
    <div className="relative mx-auto w-full max-w-[1080px] h-[420px]">
      <div className="relative h-full overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={s.key || i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100 relative' : 'opacity-0 pointer-events-none'}`}>
            <div className="grid h-full gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
              <div>{s.left}</div>
              <div>{s.right}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.key || i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2 w-8 rounded-full transition-colors ${i === index ? 'bg-indigo-600' : 'bg-neutral-300/60 dark:bg-neutral-600'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [internalTrainings, setInternalTrainings] = useState([]);
  const [externalTrainings, setExternalTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      const [internalResult, externalResult] = await Promise.all([
        getTrainings({ limit: 6 }),
        getExternalTrainings({ limit: 6 }),
      ]);

      if (internalResult && !internalResult.success) {
        setError(internalResult.message || 'Failed to load internal trainings');
        setLoading(false);
        return;
      }

      if (externalResult && !externalResult.success) {
        setError(externalResult.message || 'Failed to load external trainings');
        setLoading(false);
        return;
      }

      setInternalTrainings(internalResult?.data?.trainings || []);
      setExternalTrainings(externalResult?.data?.trainings || []);
      setLoading(false);
    }

    load();
  }, []);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => {
    addToast('Please sign in to register for this event.', 'info');
    navigate('/login');
  };

  const slides = [
    {
      key: 'landing',
      left: (
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Public landing page</p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">Browse admin-created trainings and activities.</h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
            Guests can review internal training summaries and external event details before signing in. Registration and deeper training actions require authentication.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleLogin}>Sign in to register</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go to dashboard</Button>
          </div>
        </div>
      ),
      right: (
        <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
          <div className="flex items-center gap-3 rounded-3xl bg-indigo-50 px-4 py-4 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
            <MapPin size={20} className="shrink-0" />
            <span>Free preview of trainings and activities for all visitors.</span>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Users className="text-sky-600" size={18} />
              <span>View internal training summaries and participants.</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-violet-600" size={18} />
              <span>External events show squadron details. Register only after login.</span>
            </div>
            <div className="flex items-center gap-3">
              <ClipboardList className="text-emerald-600" size={18} />
              <span>Explore event registration previews without signing in.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'featured-internal',
      left: (
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Featured internal training</p>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">{internalTrainings[0]?.title ?? 'No internal trainings yet'}</h2>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">{internalTrainings[0]?.description ?? 'When available, internal training summaries and participant previews will appear here.'}</p>
          <div className="flex items-center gap-3">
            <Button onClick={handleLogin}>Sign in for details</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go to dashboard</Button>
          </div>
        </div>
      ),
      right: internalTrainings[0] ? <InternalTrainingCard training={internalTrainings[0]} onLogin={handleLogin} /> : (
        <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
          <p className="font-semibold">No preview available</p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">There are currently no internal trainings to preview.</p>
        </div>
      ),
    },
    {
      key: 'featured-external',
      left: (
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Featured external event</p>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">{externalTrainings[0]?.title ?? 'No external events yet'}</h2>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">{externalTrainings[0]?.description ?? 'External events with squadron details will appear here for preview.'}</p>
          <div className="flex items-center gap-3">
            <Button onClick={handleLogin}>Sign in to register</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go to dashboard</Button>
          </div>
        </div>
      ),
      right: externalTrainings[0] ? <ExternalTrainingCard training={externalTrainings[0]} onRegister={handleRegister} /> : (
        <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
          <p className="font-semibold">No preview available</p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">There are currently no external events to preview.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 pt-0 pb-10 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">

      {/* Topbar (public) */}
      <header className="sticky top-0 z-50 -mx-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 sm:-mx-6 lg:-mx-8">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-end gap-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          >
            {isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Login</Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <section className="mt-6 rounded-[2rem] border border-neutral-200 bg-white/90 p-8 shadow-xl shadow-neutral-200/40 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <Carousel slides={slides} />
        </section>

        {loading ? (
          <div className="rounded-[2rem] border border-neutral-200 bg-white p-12 text-center text-neutral-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            Loading training previews...
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        ) : (
          <div className="grid gap-8">
            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">Internal trainings</p>
                  <h2 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50">Summary and participant preview</h2>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogin}>Sign in for details</Button>
              </div>

              {internalTrainings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                  No internal trainings are available right now.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {internalTrainings.map((training) => (
                    <InternalTrainingCard
                      key={training.id ?? training.training_id ?? training.title}
                      training={training}
                      onLogin={handleLogin}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">External events</p>
                  <h2 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50">Squadron details and registration preview</h2>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogin}>Sign in to register</Button>
              </div>

              {externalTrainings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                  No external events are available right now.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {externalTrainings.map((training) => (
                    <ExternalTrainingCard
                      key={training.id ?? training.training_id ?? training.title}
                      training={training}
                      onRegister={handleRegister}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
