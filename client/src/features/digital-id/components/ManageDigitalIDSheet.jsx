import { useState } from 'react';
import { Plus, Trash2, Link2, QrCode, Globe, User, Shield, Mail, Phone, MapPin, Palette, ChevronDown, Info } from 'lucide-react';
import { Modal } from '@/shared/components/ui/modal';
import { useToast } from '@/shared/components/ui/Toast';
import { cn } from '@/lib/utils';
import { LINK_TYPES, createEmptyLink } from '../utils/constants';

function LinkEditor({ link, onUpdate, onRemove }) {
  const typeInfo = LINK_TYPES.find(t => t.value === link.type) || LINK_TYPES[0];

  return (
    <div className="group relative flex flex-wrap items-start gap-2 p-4 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-800/30 hover:border-[var(--color-primary)]/30 transition-all duration-200">
      <div className="flex items-center gap-2 w-full min-[420px]:w-auto min-[420px]:min-w-[180px] min-[420px]:flex-1 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Globe size={16} />
        </div>
        <select
          value={link.type}
          onChange={e => onUpdate({ type: e.target.value })}
          className="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)] transition-all"
        >
          {LINK_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={link.label}
        onChange={e => onUpdate({ label: e.target.value })}
        placeholder="Label (e.g. My Portfolio)"
        className="w-full min-[420px]:w-auto min-[420px]:flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)] transition-all"
      />
      <input
        type="url"
        value={link.url}
        onChange={e => onUpdate({ url: e.target.value })}
        placeholder={typeInfo.placeholder}
        className="w-full min-[420px]:w-auto min-[420px]:flex-[2] min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)] transition-all"
      />
      <button
        onClick={onRemove}
        className="shrink-0 self-center p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Remove link"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]">
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

function ProfileContextCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-800/50 dark:to-neutral-800/30 p-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent rounded-full -mr-16 -mt-16" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-[var(--color-primary)]" />
          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Profile Information
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Avatar, name, position, bio, contact, and address are managed in your profile settings.
        </p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <User size={12} />
            <span>Name & Position</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Shield size={12} />
            <span>Bio</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <Mail size={12} />
            <span>Contact</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <MapPin size={12} />
            <span>Address</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyLinksState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-3">
        <Link2 size={20} />
      </div>
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        No links added yet
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 text-center max-w-[200px]">
        Add your website or social media profiles to share with others
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity shadow-sm hover:shadow-md"
      >
        <Plus size={14} />
        Add Your First Link
      </button>
    </div>
  );
}

function QRCodeSection() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-800/50 dark:to-neutral-800/30 p-5">
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-[var(--color-primary)]/5 to-transparent rounded-full -mr-12 -mb-12" />
      <div className="flex items-center gap-4 relative">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 shadow-sm">
          <QrCode size={24} className="text-neutral-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={14} className="text-[var(--color-primary)]" />
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              QR Code
            </p>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Coming soon — will be configurable in a future update.
          </p>
        </div>
        <div className="shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageDigitalIDSheet({ open, onClose, links, onSave, onAdd, onUpdate, onRemove }) {
  const { addToast } = useToast();
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    onSave();
    setDirty(false);
    addToast('Digital ID updated successfully', 'success');
    onClose();
  };

  const handleClose = () => {
    setDirty(false);
    onClose();
  };

  const handleUpdate = (id, updates) => {
    onUpdate(id, updates);
    setDirty(true);
  };

  return (
    <Modal open={open} onClose={handleClose} title="Manage Digital ID" size="lg">
      {/* Content scrolls via the Modal's own overflow handling — no
          nested scroll container here, so there's only one scrollbar. */}
      <div className="flex flex-col">
        <div className="space-y-6">
          <ProfileContextCard />

          <div className="space-y-4">
            <SectionHeader
              icon={Link2}
              title="Links"
              subtitle="Add and manage your social media profiles and websites"
              action={
                <button
                  onClick={() => { onAdd(); setDirty(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[var(--color-primary)] text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  <Plus size={14} />
                  Add Link
                </button>
              }
            />

            {links.length === 0 ? (
              <EmptyLinksState onAdd={() => { onAdd(); setDirty(true); }} />
            ) : (
              <div className="space-y-3">
                {links.map(link => (
                  <LinkEditor
                    key={link.id}
                    link={link}
                    onUpdate={(updates) => handleUpdate(link.id, updates)}
                    onRemove={() => { onRemove(link.id); setDirty(true); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <QRCodeSection />
          </div>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 pt-4 mt-6 border-t border-[var(--border)] bg-white dark:bg-neutral-900">
          <button
            onClick={handleClose}
            className={cn(
              "px-5 py-2.5 rounded-lg font-semibold text-sm border border-[var(--border)]",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "px-5 py-2.5 rounded-lg font-semibold text-sm bg-[var(--color-primary)] text-white",
              "hover:opacity-90 transition-all active:scale-95 shadow-sm hover:shadow-md"
            )}
          >
            Save Changes
          </button>
        </footer>
      </div>
    </Modal>
  );
}