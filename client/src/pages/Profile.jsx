import { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Phone, MapPin, Shield, Loader2, Save, Lock, Mail, Camera, Trash2 } from 'lucide-react';
import { getProfile, updateProfile, changePassword, uploadAvatar, deleteAvatar } from '@/services/api';
import { resolveFileUrl } from '@/lib/fileUrl';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#9ca3af'><path d='M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z'/></svg>"
  );

const FORM_FIELDS = [
  { key: 'full_name', label: 'Full Name', icon: User, type: 'text' },
  { key: 'email', label: 'Email Address', icon: Mail, type: 'email' },
  { key: 'position_title', label: 'Position / Job Title', icon: Shield, type: 'text' },
  { key: 'employee_id', label: 'Employee ID', icon: Shield, type: 'text' },
  { key: 'contact_number', label: 'Contact Number', icon: Phone, type: 'tel' },
  { key: 'employment_status', label: 'Employment Status', icon: null, type: 'select', options: ['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave'] },
  { key: 'date_hired', label: 'Date Hired', icon: Calendar, type: 'date' },
  { key: 'birthdate', label: 'Birthdate', icon: Calendar, type: 'date' },
  { key: 'address', label: 'Address', icon: MapPin, type: 'textarea' },
];

const SectionCard = ({ title, icon: Icon, children, className }) => (
  <div className={cn(
    "rounded-2xl border border-neutral-200 dark:border-neutral-800",
    "bg-white dark:bg-neutral-900 p-6",
    className
  )}>
    <div className="flex items-center gap-2.5 mb-5">
      {Icon && <Icon size={16} className="text-blue-500 dark:text-blue-400" strokeWidth={1.8} />}
      <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
        {title}
      </h2>
    </div>
    {children}
  </div>
);

function toDateInputValue(value) {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return value || '';
  }
}

export default function Profile() {
  const { addToast } = useToast();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProfile();
      if (res.data?.status === 'success') {
        setProfile(res.data.data);
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load profile data';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleInputChange = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updateData = {};
    FORM_FIELDS.forEach(f => {
      if (profile?.[f.key] !== undefined) {
        updateData[f.key] = profile[f.key];
      }
    });

    try {
      const res = await updateProfile(updateData);
      if (res.data?.status === 'success') {
        addToast('Profile updated successfully', 'success');
      } else {
        throw new Error(res.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to update profile';
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      addToast('Both current and new password are required', 'error');
      return;
    }
    if (passwordData.new_password.length < 8) {
      addToast('New password must be at least 8 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changePassword(passwordData);
      if (res.data?.status === 'success') {
        addToast('Password changed successfully', 'success');
        setPasswordData({ current_password: '', new_password: '' });
      } else {
        throw new Error(res.data?.message || 'Failed to change password');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to change password';
      addToast(message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    try {
      const res = await uploadAvatar(formData);
      if (res.data?.status === 'success') {
        addToast('Avatar updated successfully', 'success');
        setProfile((prev) => ({ ...prev, avatar_url: res.data.data.avatar_url }));
        updateUser({ avatar_url: res.data.data.avatar_url });
        setAvatarFile(null);
      } else {
        throw new Error(res.data?.message || 'Failed to upload avatar');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to upload avatar';
      addToast(message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    setUploadingAvatar(true);
    try {
      const res = await deleteAvatar();
      if (res.data?.status === 'success') {
        addToast('Avatar removed', 'success');
        setProfile((prev) => ({ ...prev, avatar_url: null }));
        updateUser({ avatar_url: null });
      } else {
        throw new Error(res.data?.message || 'Failed to remove avatar');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to remove avatar';
      addToast(message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative">
          <div className={cn(
            "h-20 w-20 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800",
            profile?.avatar_url && "border-blue-500"
          )}>
            <img
              src={profile?.avatar_url ? resolveFileUrl(profile.avatar_url) : DEFAULT_AVATAR_SVG}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          </div>
          <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
            <Camera size={14} />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{profile?.full_name || 'User'}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{profile?.email}</p>
          {avatarFile && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">{avatarFile.name}</span>
              <button onClick={handleAvatarUpload} disabled={uploadingAvatar} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                {uploadingAvatar ? 'Uploading...' : 'Upload'}
              </button>
              <button onClick={() => setAvatarFile(null)} className="text-xs text-neutral-500 hover:text-neutral-700">
                Cancel
              </button>
            </div>
          )}
          {profile?.avatar_url && !avatarFile && (
            <button onClick={handleAvatarDelete} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
              <Trash2 size={12} /> Remove avatar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Personal Information" icon={User}>
          <div className="space-y-4">
            {FORM_FIELDS.slice(0, 5).map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={profile[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    )}
                  >
                    <option value="">Select...</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={profile[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    rows={2}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                      "resize-none"
                    )}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                ) : field.type === 'date' ? (
                  <input
                    type={field.type}
                    value={toDateInputValue(profile[field.key])}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    )}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={profile[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    )}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Employment Details" icon={Shield}>
          <div className="space-y-4">
            {FORM_FIELDS.slice(5).map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={profile[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    )}
                  >
                    <option value="">Select...</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={profile[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    rows={2}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                      "resize-none"
                    )}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                ) : field.type === 'date' ? (
                  <input
                    type={field.type}
                    value={toDateInputValue(profile[field.key])}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    )}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={profile[field.key] || ''}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                      "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                      "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    )}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Change Password" icon={Lock}>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.current_password}
              onChange={e => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
              className={cn(
                "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.new_password}
              onChange={e => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
              className={cn(
                "w-full rounded-md border border-neutral-300 dark:border-neutral-600",
                "bg-white dark:bg-neutral-800 px-3 py-2 text-sm",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
              placeholder="Enter new password (min 8 characters)"
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={changingPassword}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm",
              "bg-neutral-800 hover:bg-neutral-900 text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200"
            )}
          >
            {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Change Password
          </button>
        </div>
      </SectionCard>
    </div>
  );
}