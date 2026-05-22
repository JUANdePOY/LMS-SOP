import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import TrainingPreviewCard from '@/components/trainings/TrainingPreviewCard';
import CarouselSlideContent from '@/components/landing/CarouselSlideContent';
import useLandingAnnouncements from '@/hooks/useLandingAnnouncements';
import useLandingTrainings from '@/hooks/useLandingTrainings';
import useCarouselSlides from '@/hooks/useCarouselSlides';

function Carousel({ slides = [], onAction }) {
  if (!slides.length) return null;

  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      spaceBetween={0}
      slidesPerView={1}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      loop={true}
      pagination={{ clickable: true }}
      className="h-[420px] w-full max-w-[1080px] mx-auto"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.key}>
          <div className="grid h-full gap-8 lg:grid-cols-[1.4fr] lg:items-center">
            <CarouselSlideContent
              announcement={slide.announcement}
              isEmpty={slide.isEmpty}
              onAction={onAction}
            />
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const trainingsRef = useRef(null);

  const scrollToTrainings = () => {
    trainingsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { announcements, loading: loadingAnnouncements, error: announcementsError } = useLandingAnnouncements();
  const { internalTrainings, externalTrainings, loading: loadingTrainings, error: trainingsError } = useLandingTrainings();
  const carouselSlides = useCarouselSlides(announcements);

  const handleLogin = () => navigate('/login');

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
          <Button variant="ghost" size="sm" onClick={handleLogin}>Login</Button>
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
          ) : announcementsError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {announcementsError}
            </div>
          ) : (
            <Carousel slides={carouselSlides} onAction={scrollToTrainings} />
          )}
        </section>

        {/* Internal Trainings Section */}
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
                  variant="internal"
                />
              ))}
            </div>
          )}
        </section>

        {/* External Events Section */}
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