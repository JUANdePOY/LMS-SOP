import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Bell,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Camera,
  Trash2,
  Check,
  X,
  Info,
} from "lucide-react";
import { useToast } from "@/shared/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
} from "@/services/api";
import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import UserAvatar from "@/shared/components/ui/Avatar";
import { resolveFileUrl } from "@/lib/fileUrl";
import { cn } from "@/lib/utils";
import AppearanceSettings from "@/features/employee/components/AppearanceSettings";

const PASSWORD_MIN_LENGTH = 8;

const PASSWORD_RULES = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { label: "Contains at least one letter", test: (v) => /[a-zA-Z]/.test(v) },
  { label: "Contains at least one number", test: (v) => /\d/.test(v) },
];

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Icon size={18} />
      </div>
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled, label, description, error }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {label}
        </p>
        {description && (
          <p className="text-xs text-neutral-500">{description}</p>
        )}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-label={checked ? "Turn off" : "Turn on"}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          checked
            ? "bg-[var(--color-primary)]"
            : "bg-neutral-200 dark:bg-neutral-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function PasswordStrengthIndicator({ password }) {
  if (!password) {
    return null;
  }

  const satisfied = PASSWORD_RULES.filter((rule) => rule.test(password));
  const allValid = satisfied.length === PASSWORD_RULES.length;
  const pct = (satisfied.length / PASSWORD_RULES.length) * 100;

  let barColor = "bg-neutral-300";
  if (satisfied.length >= 3) barColor = "bg-green-500";
  else if (satisfied.length >= 2) barColor = "bg-amber-500";

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500">Password strength</p>
        <p className="text-xs font-medium">
          {satisfied.length}/{PASSWORD_RULES.length} requirements met
        </p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            barColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <div
              key={rule.label}
              className="flex items-center gap-1.5 text-xs"
            >
              {ok ? (
                <Check size={12} className="text-green-500" />
              ) : (
                <X size={12} className="text-neutral-400" />
              )}
              <span
                className={ok ? "text-green-600" : "text-neutral-500"}
              >
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
      {allValid && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Info size={12} />
          Password looks strong
        </p>
      )}
    </div>
  );
}

export default function EmployeeSettings() {
  const toast = useToast();
  const { user, updateUser } = useAuth();

  const {
    permission,
    loading: notifLoading,
    requestPermission,
    unsubscribe,
    isSupported,
    error: notifError,
  } = usePushNotifications();

  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const fileInputRef = useRef(null);
  const initialStateRef = useRef({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getProfile();
        if (res.data?.status === "success") {
          const data = res.data.data;
          setProfile(data);
          setEmail(data.email || "");
          initialStateRef.current = {
            email: data.email || "",
          };
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const hasEmailChange = email !== (initialStateRef.current.email ?? profile?.email);
  const emailValid = email.includes("@") && email.length > 0;
  const passwordValid =
    currentPassword.length > 0 &&
    newPassword.length >= PASSWORD_MIN_LENGTH &&
    PASSWORD_RULES.every((rule) => rule.test(newPassword));
  const hasChanges = hasEmailChange || (showPasswordSection && currentPassword && newPassword);

  const handleAvatarSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, or WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Maximum size is 5 MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", avatarFile);
    try {
      const res = await uploadAvatar(formData);
      if (res.data?.status === "success") {
        toast.success("Avatar updated successfully");
        setProfile((prev) => ({
          ...prev,
          avatar_url: res.data.data.avatar_url,
        }));
        if (user) {
          updateUser({ avatar_url: res.data.data.avatar_url });
        }
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        throw new Error(res.data?.message || "Failed to upload avatar");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      const res = await deleteAvatar();
      if (res.data?.status === "success") {
        toast.success("Avatar removed");
        setProfile((prev) => ({ ...prev, avatar_url: null }));
        if (user) updateUser({ avatar_url: null });
      } else {
        throw new Error(res.data?.message || "Failed to remove avatar");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to remove avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (showPasswordSection && currentPassword && newPassword) {
      if (!passwordValid) {
        toast.error("Please fix the password requirements before saving");
        return;
      }
    }

    setSaving(true);
    try {
      if (currentPassword && newPassword) {
        await changePassword({
          current_password: currentPassword,
          new_password: newPassword,
        });
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setShowPasswordSection(false);
      }

      if (emailValid && email !== profile?.email) {
        const res = await updateProfile({ email });
        if (res.data?.status === "success") {
          toast.success("Profile updated successfully");
          if (user) {
            updateUser({ ...user, email });
          }
          initialStateRef.current.email = email;
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleNotifToggle = async () => {
    try {
      if (permission === "granted") {
        await unsubscribe();
        toast.success("Push notifications disabled");
      } else {
        await requestPermission();
        toast.success("Push notifications enabled");
      }
    } catch (err) {
      toast.error(
        err?.message ||
          err?.response?.data?.message ||
          "Failed to update notification settings"
      );
    }
  };

  const notifErrorDisplay = notifError || undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-secondary)]" />
      </div>
    );
  }

  const fullName = profile?.full_name || user?.full_name || "User";
  const roleLabel = profile?.role || user?.role || "employee";
  const employeeId = profile?.employee_id;
  const departmentName = profile?.department_name;
  const dateHired = profile?.date_hired;

  let roleDisplay = roleLabel;
  if (typeof roleLabel === "string") {
    roleDisplay = roleLabel
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile + Avatar */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={User}
            title="Profile"
            description="Update your photo, email, and password"
          />
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shadow">
                <UserAvatar user={profile || user} size="xl" />
              </div>
              <label
                htmlFor="avatar-upload"
                className={cn(
                  "absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white shadow transition-colors",
                  profile?.avatar_url
                    ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                    : "bg-neutral-600 hover:bg-neutral-700"
                )}
                title="Change avatar"
              >
                <Camera size={13} />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarSelect(e.target.files?.[0] || null)}
                  disabled={uploadingAvatar}
                  aria-label="Upload avatar"
                />
              </label>
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {fullName}
              </p>
              <p className="text-xs text-neutral-500">{profile?.email}</p>

              {avatarFile && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-neutral-500 truncate max-w-[160px]">
                    {avatarFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover] fb-link-hover"
                  >
                    {uploadingAvatar ? "Uploading..." : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {profile?.avatar_url && !avatarFile && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={uploadingAvatar}
                  className="mt-1 text-xs text-red-600 hover:text-red-700"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Email Address
              </label>
              {hasEmailChange && (
                <span className="text-[10px] text-amber-600 flex items-center gap-1">
                  <Info size={10} /> Unsaved
                </span>
              )}
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={!emailValid && email ? "border-red-500" : ""}
            />
            {!emailValid && email && (
              <p className="text-[11px] text-red-500">
                Please enter a valid email address
              </p>
            )}
            <p className="text-[11px] text-neutral-500">
              We will send a confirmation to this email
            </p>
          </div>

          {/* Password */}
          {!showPasswordSection ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordSection(true)}
              className="gap-2"
            >
              <Shield size={14} />
              Change Password
            </Button>
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 p-4 space-y-3">
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter current password"
              />
              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Enter new password"
              />
              <PasswordStrengthIndicator password={newPassword} />

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword("");
                    setNewPassword("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <SectionHeader
            icon={Info}
            title="Account Information"
            description="Details about your account"
          />
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-neutral-500">Role</span>
            <span className="text-neutral-800 dark:text-neutral-200">
              {roleDisplay}
            </span>
          </div>
          {employeeId && (
            <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">Employee ID</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-mono">
                {employeeId}
              </span>
            </div>
          )}
          {departmentName && (
            <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-neutral-500">Department</span>
              <span className="text-neutral-800 dark:text-neutral-200">
                {departmentName}
              </span>
            </div>
          )}
          {dateHired && (
            <div className="flex justify-between py-2">
              <span className="text-neutral-500">Date Hired</span>
              <span className="text-neutral-800 dark:text-neutral-200">
                {dateHired}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <AppearanceSettings />

      {/* Notifications */}
      {isSupported && (
        <Card>
          <CardHeader>
            <SectionHeader
              icon={Bell}
              title="Notifications"
              description="Manage how you receive notifications"
            />
          </CardHeader>
          <CardContent>
            <Toggle
              label="Push Notifications"
              description={
                permission === "granted"
                  ? "You will receive push notifications even when the app is closed"
                  : permission === "denied"
                  ? "Permission was denied. Update in your browser site settings."
                  : "Enable to receive push notifications"
              }
              checked={permission === "granted"}
              onChange={handleNotifToggle}
              disabled={notifLoading}
              error={notifErrorDisplay}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
