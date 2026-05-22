import { Megaphone, AlertCircle, Calendar, User, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  General: { 
    icon: Megaphone, 
    accent: 'border-l-blue-500', 
    iconColor: 'text-blue-600 dark:text-blue-400', 
    iconBg: 'bg-blue-100 dark:bg-blue-900/30' 
  },
  Training: { 
    icon: Calendar, 
    accent: 'border-l-green-500', 
    iconColor: 'text-green-600 dark:text-green-400', 
    iconBg: 'bg-green-100 dark:bg-green-900/30' 
  },
  Deployment: { 
    icon: Shield, 
    accent: 'border-l-purple-500', 
    iconColor: 'text-purple-600 dark:text-purple-400', 
    iconBg: 'bg-purple-100 dark:bg-purple-900/30' 
  },
  Administrative: { 
    icon: User, 
    accent: 'border-l-amber-500', 
    iconColor: 'text-amber-600 dark:text-amber-400', 
    iconBg: 'bg-amber-100 dark:bg-amber-900/30' 
  },
  Emergency: { 
    icon: AlertCircle, 
    accent: 'border-l-red-500', 
    iconColor: 'text-red-600 dark:text-red-400', 
    iconBg: 'bg-red-100 dark:bg-red-900/30' 
  },
};

const priorityConfig = {
  critical: { 
    bg: 'bg-red-600', 
    text: 'text-white',
    label: 'CRITICAL'
  },
  high: { 
    bg: 'bg-orange-500', 
    text: 'text-white',
    label: 'HIGH'
  },
  medium: { 
    bg: 'bg-yellow-500', 
    text: 'text-neutral-900',
    label: 'MED'
  },
  low: { 
    bg: 'bg-slate-400', 
    text: 'text-white',
    label: 'LOW'
  },
};

export default function AnnouncementCard({ announcement, onEdit, onDelete }) {
  const { icon: Icon, accent, iconColor, iconBg } = typeConfig[announcement.type] || typeConfig.General;
  const priorityStyle = priorityConfig[announcement.priority];

  return (
    <div className={cn(
      "group bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800",
      "shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden",
      accent
    )}>
      {/* Accent border */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="p-5">
        {/* Header with icon and badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", iconBg)}>
              <Icon size={22} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-neutral-900 dark:text-neutral-50 text-base leading-tight truncate">
                {announcement.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {announcement.author}
                </span>
                <span className="text-neutral-300 dark:text-neutral-600">•</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {new Date(announcement.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
          
          {/* Priority badge */}
          <span className={cn(
            "px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase",
            priorityStyle.bg,
            priorityStyle.text
          )}>
            {priorityStyle.label}
          </span>
        </div>

        {/* Body content */}
        <div className="relative pl-2">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3 pl-3">
            {announcement.body}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-neutral-400" />
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded",
              announcement.status === 'active' 
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" 
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            )}>
              {announcement.status === 'active' ? 'OPERATIVE' : 'INACTIVE'}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(announcement)}
              className="px-3 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(announcement.id)}
              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}