import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import InternalTrainingCard from '@/components/landing/InternalTrainingCard';
import ExternalTrainingCard from '@/components/landing/ExternalTrainingCard';
import CarouselSlideContent from '@/components/landing/CarouselSlideContent';
import useLandingAnnouncements from '@/hooks/useLandingAnnouncements';
import useLandingTrainings from '@/hooks/useLandingTrainings';
import useCarouselSlides from '@/hooks/useCarouselSlides';

const ITEMS_PER_PAGE = 9;

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

function PaginationControls({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(i + 1);
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      
      <div className="flex gap-1">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-200 ${
              currentPage === page
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function Landing() {
  const trainingsRef = useRef(null);
  const [internalPage, setInternalPage] = useState(1);
  const [externalPage, setExternalPage] = useState(1);

  const scrollToTrainings = () => {
    trainingsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { announcements, loading: loadingAnnouncements, error: announcementsError } = useLandingAnnouncements();
  const { internalTrainings, externalTrainings, loading: loadingTrainings, error: trainingsError } = useLandingTrainings();
  const carouselSlides = useCarouselSlides(announcements);

  const internalTrainingsPaginated = internalTrainings.slice(
    (internalPage - 1) * ITEMS_PER_PAGE,
    internalPage * ITEMS_PER_PAGE
  );
  const externalTrainingsPaginated = externalTrainings.slice(
    (externalPage - 1) * ITEMS_PER_PAGE,
    externalPage * ITEMS_PER_PAGE
  );

  const internalTotalPages = Math.ceil(internalTrainings.length / ITEMS_PER_PAGE) || 1;
  const externalTotalPages = Math.ceil(externalTrainings.length / ITEMS_PER_PAGE) || 1;

  return (
    <div className="flex flex-col gap-12 px-4 sm:px-6 lg:px-8">
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
          <>
            <div className="grid gap-5 md:grid-cols-3">
              {internalTrainingsPaginated.map((training) => (
                <InternalTrainingCard
                  key={training.id ?? training.training_id ?? training.title}
                  training={training}
                />
              ))}
            </div>
            <PaginationControls
              currentPage={internalPage}
              totalPages={internalTotalPages}
              onPageChange={setInternalPage}
            />
          </>
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
          <>
            <div className="grid gap-5 md:grid-cols-3">
              {externalTrainingsPaginated.map((training) => (
                <ExternalTrainingCard
                  key={training.id ?? training.training_id ?? training.title}
                  training={training}
                />
              ))}
            </div>
            <PaginationControls
              currentPage={externalPage}
              totalPages={externalTotalPages}
              onPageChange={setExternalPage}
            />
          </>
        )}
      </section>
    </div>
  );
}