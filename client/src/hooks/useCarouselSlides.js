import { useMemo } from 'react';

const getBadgeIcon = (announcementType) => {
  if (announcementType === 'urgent') return '🔴';
  if (announcementType === 'event') return '📅';
  return '📢';
};

export default function useCarouselSlides(announcements) {
  return useMemo(() => {
    if (!announcements.length) {
      return [{
        key: 'no-announcements',
        announcement: null,
        isEmpty: true,
      }];
    }

    return announcements.map((announcement) => ({
      key: `ann-${announcement.id}`,
      announcement,
      isEmpty: false,
      badgeIcon: getBadgeIcon(announcement.announcement_type),
    }));
  }, [announcements]);
}