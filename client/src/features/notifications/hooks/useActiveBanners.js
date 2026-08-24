import { useEffect, useState, useCallback } from 'react';
import { getActiveBanners } from '@/services/api';

// Loads server-managed, audience-targeted banners for the current user and
// maps them into the shape BannerSection expects. `remoteId` lets the banner
// component record impression/click/dismiss analytics against the server.
export function useActiveBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActiveBanners();
      const items = Array.isArray(res.data?.banners) ? res.data.banners : [];
      setBanners(
        items.map((b) => ({
          id: `banner-${b.id}`,
          remoteId: b.id,
          type: b.type,
          title: b.title,
          message: b.message || '',
          link: b.ctaLink || null,
          ctaLabel: b.ctaLabel || null,
          imageUrl: b.imageUrl || null,
          priority: typeof b.priority === 'number' ? b.priority : 0,
        }))
      );
      setError(null);
    } catch {
      setError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { banners, loading, error, reload: load };
}
