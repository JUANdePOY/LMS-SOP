import { useState, useEffect, useCallback } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { getProfile, updateProfile, changePassword, uploadAvatar, deleteAvatar } from '@/services/api';
import { useToast } from '@/shared/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ProfileCover from '@/features/profile/components/ProfileCover';
import IntroCard from '@/features/profile/components/IntroCard';
import EditProfileSheet from '@/features/profile/components/EditProfileSheet';
import { Link } from 'react-router-dom';

const FORM_FIELDS = [
  { key: 'full_name', label: 'Full Name', type: 'text' },
  { key: 'email', label: 'Email Address', type: 'email' },
  { key: 'position_title', label: 'Position / Job Title', type: 'text' },
  { key: 'employee_id', label: 'Employee ID', type: 'text' },
  { key: 'contact_number', label: 'Contact Number', type: 'tel' },
  { key: 'employment_status', label: 'Employment Status', type: 'select', options: ['Regular', 'Probationary', 'Contractual', 'Resigned/Terminated', 'Retired', 'On Leave'] },
  { key: 'date_hired', label: 'Date Hired', type: 'date' },
  { key: 'birthdate', label: 'Birthdate', type: 'date' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
];

export default function Profile() {
  const { addToast } = useToast();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
        setEditOpen(false);
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
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-secondary)]" />
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
    <div className="max-w-5xl mx-auto space-y-4">
      <ProfileCover
        profile={profile}
        onEditProfile={() => setEditOpen(true)}
        onPickAvatar={setAvatarFile}
        avatarFile={avatarFile}
        onUploadAvatar={handleAvatarUpload}
        uploadingAvatar={uploadingAvatar}
        onRemoveAvatar={handleAvatarDelete}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Link
            to={`/digital-id/${profile.id}`}
            className="flex items-center justify-center gap-2 w-full rounded-lg bg-neutral-800 hover:bg-neutral-900 text-white font-semibold text-sm px-4 py-2 transition-colors"
          >
            My Digital ID
          </Link>
          <IntroCard profile={profile} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="fb-card p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Lock size={16} className="text-[var(--color-primary)]" strokeWidth={1.8} />
              <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Change Password
              </h2>
            </div>
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
                    "focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)]"
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
                    "focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)]"
                  )}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm",
                  "bg-neutral-800 hover:bg-neutral-900 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
              >
                {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fields={FORM_FIELDS}
        profile={profile}
        onChange={handleInputChange}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
