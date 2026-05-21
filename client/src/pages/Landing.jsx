import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { fetchActiveAnnouncements } from '@/services/announcementsService';
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
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100 relative' : 'opacity-0 pointer-events-none'}`}
          >
            <div className="grid h-full gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
              <div>{s.left}</div>
              <div>{s.right}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      {slides.length > 1 && (
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
      )}
    </div>
  );
}

export default function Landing() {
  const [announcements, setAnnouncements] = useState([]);
  const [internalTrainings, setInternalTrainings] = useState([]);
  const [externalTrainings, setExternalTrainings] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingTrainings, setLoadingTrainings] = useState(true);
  const [error, setError] = useState('');
  const [trainingsError, setTrainingsError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  // Load announcements for the carousel
  useEffect(() => {
    async function load() {
      setLoadingAnnouncements(true);
      const result = await fetchActiveAnnouncements({ limit: 50 });
      if (result && !result.success) {
        setError(result.message || 'Failed to load announcements');
      }
      setAnnouncements(result?.data?.announcements || []);
      setLoadingAnnouncements(false);
    }
    load();
  }, []);

  // Load trainings for the bottom grids
  useEffect(() => {
    async function load() {
      setLoadingTrainings(true);
      setTrainingsError('');

      const [internalResult, externalResult] = await Promise.all([
        getTrainings({ limit: 6 }),
        getExternalTrainings({ limit: 6 }),
      ]);

      if (internalResult && !internalResult.success) {
        setTrainingsError(internalResult.message || 'Failed to load internal trainings');
        setLoadingTrainings(false);
        return;
      }

      if (externalResult && !externalResult.success) {
        setTrainingsError(externalResult.message || 'Failed to load external trainings');
        setLoadingTrainings(false);
        return;
      }

      setInternalTrainings(internalResult?.data?.trainings || []);
      setExternalTrainings(externalResult?.data?.trainings || []);
      setLoadingTrainings(false);
    }

    load();
  }, []);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => {
    addToast('Please sign in to register for this event.', 'info');
    navigate('/login');
  };

  // ── Carousel slides driven entirely by active announcements ────────────────

  const buildCarouselSlides = () => {
    if (!announcements.length) {
      return [{
        key: 'no-announcements',
        left: (
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">No Announcements</p>
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">No announcements yet</h2>
            <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Admin-created announcements will appear here as soon as they are published.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleLogin}>Sign in</Button>
            </div>
          </div>
        ),
        right: (
          <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
            <div className="flex items-center gap-3 rounded-3xl bg-indigo-50 px-4 py-4 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
              <ClipboardList size={20} className="shrink-0" />
              <span>Announcements from the admin team will be shown here.</span>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-sky-600" size={18} />
                <span>Stay tuned for upcoming events and updates.</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-emerald-600" size={18} />
                <span>Check back regularly or sign in to receive notifications.</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-amber-600" size={18} />
                <span>Only admins can publish announcements.</span>
              </div>
            </div>
          </div>
        ),
      }];
    }

    return announcements.map((announcement) => {
      const badgeClass =
        announcement.announcement_type === 'urgent' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' :
        announcement.announcement_type === 'event'    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' :
                                                        'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300';
      const badgeIcon =
        announcement.announcement_type === 'urgent' ? '🔴' :
        announcement.announcement_type === 'event'    ? '📅' :
                                                        '📢';

      const startDate = announcement.start_date ? new Date(announcement.start_date).toLocaleDateString() : '';
      const endDate   = announcement.end_date   ? new Date(announcement.end_date).toLocaleDateString()   : '';
      const dateLabel = startDate && endDate ? `${startDate} – ${endDate}` : startDate || 'No date set';

      return {
        key: `ann-${announcement.id}`,
        left: (
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
              {badgeIcon} Announcement
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
              {announcement.title}
            </h2>
            <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              {announcement.body}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="default" size="sm" onClick={handleLogin}>Sign in</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Go to dashboard</Button>
            </div>
          </div>
        ),
        right: (
          <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
              {announcement.announcement_type === 'urgent' ? '🔴 Urgent' :
               announcement.announcement_type === 'event'    ? '📅 Event' :
                                                               '📢 General'}
            </span>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-indigo-500 shrink-0" size={18} />
                <span>{dateLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-sky-600 shrink-0" size={18} />
                <span>
                  {announcement.audience === 'admin'    ? 'Admin only' :
                   announcement.audience === 'reservist' ? 'Reservists only' :
                                                           'All users'}
                </span>
              </div>
              {announcement.is_pinned && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-amber-500 shrink-0" size={18} />
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Pinned</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <ClipboardList className="text-indigo-500 shrink-0" size={18} />
                <span>ID: {announcement.id}</span>
              </div>
            </div>
          </div>
        ),
      };
    });
  };

  const carouselSlides = buildCarouselSlides();

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
        {/* ═══════════════════════════════════════════════════════════════
            CAROUSEL — displays admin-created announcements as rotating slides
        ═══════════════════════════════════════════════════════════════ */}
        <section className="mt-6 rounded-[2rem] border border-neutral-200 bg-white/90 p-8 shadow-xl shadow-neutral-200/40 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          {loadingAnnouncements ? (
            <div className="flex h-[300px] items-center justify-center text-neutral-600 dark:text-neutral-300">
              Loading announcements…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {error}
            </div>
          ) : (
            <Carousel slides={carouselSlides} />
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            INTERNAL TRAININGS — admin-created, full participant grid
        ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">Internal trainings</p>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50">Summary and participant preview</h2>
          </div>

          {loadingTrainings ? (
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-12 text-center text-neutral-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              Loading training previews…
            </div>
          ) : trainingsError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {trainingsError}
            </div>
          ) : internalTrainings.length === 0 ? (
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

        {/* ═══════════════════════════════════════════════════════════════
            EXTERNAL EVENTS — admin-created, squadron registration grid
        ═══════════════════════════════════════════════════════════════ */}
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">External events</p>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50">Squadron details and registration preview</h2>
          </div>

          {loadingTrainings ? (
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-12 text-center text-neutral-600 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              Loading event previews…
            </div>
          ) : trainingsError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {trainingsError}
            </div>
          ) : externalTrainings.length === 0 ? (
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
    </div>
  );
}
