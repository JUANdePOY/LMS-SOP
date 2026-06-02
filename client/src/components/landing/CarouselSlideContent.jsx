import { Button } from '@/components/ui/button';

export default function CarouselSlideContent({ announcement, onAction, isEmpty = false }) {
  if (isEmpty) {
    return (
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">No Announcements</p>
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">No announcements yet</h2>
          <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
            Admin-created announcements will appear here as soon as they are published.
          </p>
        </div>
        <div className="pt-2">
          <Button onClick={onAction}>View All Trainings</Button>
        </div>
      </div>
    );
  }

  const badgeIcon =
    announcement.announcement_type === 'urgent' ? '🔴' :
    announcement.announcement_type === 'event' ? '📅' :
    '📢';

  return (
    <div className="space-y-5">
      <i><p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
        {badgeIcon} Announcement
      </p></i>
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
          {announcement.title}
        </h2>
        <p className="max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
          {announcement.body}
        </p>
      </div>
      <div className="pt-2">
        <Button variant="default" size="sm" onClick={onAction}>View All Trainings</Button>
      </div>
    </div>
  );
}