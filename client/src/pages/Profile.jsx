import { useState, useEffect } from 'react';
import { User, Calendar, Phone, MapPin, Droplet, Shield, Loader2, Save, Lock } from 'lucide-react';
import { getMyProfile, updateMyProfile, updateProfile } from '@/services/api';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const FORM_FIELDS = [
  { key: 'first_name', label: 'First Name', icon: User, type: 'text' },
  { key: 'last_name', label: 'Last Name', icon: User, type: 'text' },
  { key: 'rank', label: 'Rank', icon: Shield, type: 'text' },
  { key: 'phone_number', label: 'Phone Number', icon: Phone, type: 'tel' },
  { key: 'address', label: 'Address', icon: MapPin, type: 'textarea' },
  { key: 'date_of_birth', label: 'Date of Birth', icon: Calendar, type: 'date' },
  { key: 'sex', label: 'Sex', icon: null, type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'blood_type', label: 'Blood Type', icon: Droplet, type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name', icon: User, type: 'text' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', icon: Phone, type: 'tel' },
  { key: 'emergency_contact_address', label: 'Emergency Contact Address', icon: MapPin, type: 'textarea' },
  { key: 'civil_status', label: 'Civil Status', icon: null, type: 'select', options: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'] },
  { key: 'citizenship', label: 'Citizenship', icon: null, type: 'text' },
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

export default function Profile() {
  const { addToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyProfile();
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
  };

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
      const res = await updateMyProfile(updateData);
      if (res.data?.status === 'success') {
        setProfile(res.data.data);
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
    if (passwordData.new_password.length < 6) {
      addToast('New password must be at least 6 characters', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await updateProfile(passwordData);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info Section */}
        <SectionCard title="Personal Information" icon={User}>
          <div className="space-y-4">
            {FORM_FIELDS.slice(0, 6).map(field => (
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

        {/* Contact & Emergency Section */}
        <SectionCard title="Contact & Emergency" icon={Phone}>
          <div className="space-y-4">
            {FORM_FIELDS.slice(6, 12).map(field => (
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

{/* Password Change Section */}
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
               placeholder="Enter new password (min 6 characters)"
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