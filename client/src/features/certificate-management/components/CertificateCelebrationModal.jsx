import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/shared/components/ui/button';
import { Download, X } from 'lucide-react';
import CertificatePreviewCanvas from './CertificatePreviewCanvas';

const CONFETTI_DURATION = 3000;

function fireConfetti(confettiRef) {
  const end = Date.now() + CONFETTI_DURATION;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#bb0000', '#ffffff', '#00bb00', '#0000bb', '#ffd700'],
      zIndex: 100,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#bb0000', '#ffffff', '#00bb00', '#0000bb', '#ffd700'],
      zIndex: 100,
    });

    if (Date.now() < end) {
      confettiRef.current = requestAnimationFrame(frame);
    }
  };

  confettiRef.current = requestAnimationFrame(frame);
}

export default function CertificateCelebrationModal({
  open,
  onClose,
  certificate,
  title = 'Congratulations!',
  description = 'You completed this course.',
}) {
  const [showContent, setShowContent] = useState(false);
  const canvasRef = useRef(null);
  const confettiRef = useRef(null);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    if (open) {
      setShowContent(false);
      setCanvasKey((k) => k + 1);

      const confettiTimer = setTimeout(() => {
        fireConfetti(confettiRef);
      }, 200);

      const contentTimer = setTimeout(() => {
        setShowContent(true);
      }, 50);

      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(contentTimer);
        if (confettiRef.current) {
          cancelAnimationFrame(confettiRef.current);
        }
      };
    }
  }, [open, certificate]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    const certNumber = certificate?.certificate_number || 'completion';
    await canvasRef.current.downloadAsImage(`certificate-${certNumber}.png`);
  }, [certificate]);

  if (!open) return null;

  const sections = certificate?.resolved_sections
    ? typeof certificate.resolved_sections === 'string'
      ? JSON.parse(certificate.resolved_sections)
      : certificate.resolved_sections
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm">
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative w-full h-full flex flex-col items-center justify-center gap-4 p-4 sm:p-8"
          >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              {sections && (
                <Button
                  onClick={handleDownload}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Download size={16} />
                  Download
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {title}
              </h2>
              <p className="text-white/70">{description}</p>
            </div>

            {sections ? (
              <div
                className="w-full max-w-5xl h-[60vh] max-h-[60vh] overflow-hidden rounded-lg"
                key={canvasKey}
              >
                <CertificatePreviewCanvas
                  ref={canvasRef}
                  sections={sections}
                  framePreview={
                    certificate.template_public_id
                      ? `/api/certificate-templates/${certificate.template_public_id}/frame`
                      : null
                  }
                  orientation={certificate.template_orientation || 'landscape'}
                  widthPx={certificate.template_width_px}
                  heightPx={certificate.template_height_px}
                  bare
                />
              </div>
            ) : (
              <div className="text-center text-white/70">
                <p>Certificate will be available soon.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}