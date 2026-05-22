import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { fetchActiveAnnouncements } from '@/services/announcementsService';
import { getTrainings, getExternalTrainings } from '@/services/trainingsService';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import TrainingPreviewCard from '@/components/trainings/TrainingPreviewCard';

function Carousel({ slides = [] }) {
  return slides.length > 0 ? (
    <Swiper
      modules={[Autoplay, Pagination]}
      spaceBetween={0}
      slidesPerView={1}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      loop={true}
      pagination={{ clickable: true }}
      className="h-[420px] w-full max-w-[1080px] mx-auto"
    >
      {slides.map((s, i) => (
        <SwiperSlide key={s.key || i}>
          <div className="grid h-full gap-8 lg:grid-cols-[1.4fr] lg:items-center">
            <div>{s.left}</div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  ) : null;
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
  const trainingsRef = useRef(null);

  const scrollToTrainings = () => {
    trainingsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
              <Button onClick={scrollToTrainings}>View All Trainings</Button>
            </div>
          </div>
        ),
      }];
    }

    return announcements.map((announcement) => {
      const badgeIcon =
        announcement.announcement_type === 'urgent' ? '🔴' :
        announcement.announcement_type === 'event'    ? '📅' :
                                                       '📢';

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
              <Button variant="default" size="sm" onClick={scrollToTrainings}>View All Trainings</Button>
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
        <section ref={trainingsRef} className="space-y-6">
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
                 <TrainingPreviewCard
                   key={training.id ?? training.training_id ?? training.title}
                   training={training}
                   onLogin={handleLogin}
                   variant="internal"
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
                 <TrainingPreviewCard
                   key={training.id ?? training.training_id ?? training.title}
                   training={training}
                   onLogin={handleRegister}
                   variant="external"
                 />
               ))}
             </div>
          )}
        </section>
      </div>
    </div>
  );
}
