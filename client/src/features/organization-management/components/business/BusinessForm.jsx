import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, ImagePlus } from 'lucide-react';
import { uploadBusinessLogo, deleteBusinessLogo, getBusinessLogo } from '@/features/organization-management/api/business.api';

const defaultForm = {
  business_code: '',
  business_name: '',
  description: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
};

const CODE_MAX = 20;
const NAME_MAX = 150;
const DESC_MAX = 500;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SectionHeading({ children, subtitle }) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
      )}
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

export default function BusinessForm({ initialData, onSubmit, onCancel, loading }) {
  const businessId = initialData?.id || null;
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);
  const formId = useId();

  useEffect(() => {
    if (initialData) {
      setForm({
        business_code: initialData.business_code || '',
        business_name: initialData.business_name || '',
        description: initialData.description || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        status: initialData.status || 'active',
      });
      setLogoFile(null);
      setUploadError('');
      if (initialData.logo_data) {
        setLogoPreviewUrl(URL.createObjectURL(new Blob([initialData.logo_data], { type: initialData.logo_mime_type })));
      } else if (initialData.logo_url) {
        setLogoPreviewUrl(initialData.logo_url);
      } else {
        setLogoPreviewUrl('');
      }
    } else {
      setForm(defaultForm);
      setLogoPreviewUrl('');
      setLogoFile(null);
    }
    setUploadError('');
    setErrors({});
    setTouched({});
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const processFile = useCallback(async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setUploadError('');
    setUploading(true);

    const blobUrl = URL.createObjectURL(file);
    setLogoPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return blobUrl;
    });
    setLogoFile(file);

    if (businessId) {
      try {
        const formData = new FormData();
        formData.append('logo', file);
        await uploadBusinessLogo(businessId, formData);
        setLogoFile(null);
      } catch (err) {
        console.error('Failed to upload logo:', err);
        setUploadError('Upload failed. Please try again.');
        setLogoPreviewUrl(initialData?.logo_data
          ? URL.createObjectURL(new Blob([initialData.logo_data], { type: initialData.logo_mime_type }))
          : (initialData?.logo_url || ''));
      } finally {
        setUploading(false);
      }
    } else {
      setUploading(false);
    }
  }, [businessId, initialData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
    e.target.value = '';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer.types?.includes('Files')) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (loading || uploading) return;
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const clearLogo = useCallback((e) => {
    e?.stopPropagation();
    setLogoPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return '';
    });
    setLogoFile(null);
    setUploadError('');
    if (businessId) {
      deleteBusinessLogo(businessId).catch(() => {});
    }
  }, [businessId]);

  const validateField = (field, value) => {
    switch (field) {
      case 'business_code':
        return value.trim() ? '' : 'Business code is required';
      case 'business_name':
        return value.trim() ? '' : 'Business name is required';
      case 'email':
        return value && !EMAIL_RE.test(value) ? 'Enter a valid email address' : '';
      default:
        return '';
    }
  };

  const validate = () => {
    const errs = {
      business_code: validateField('business_code', form.business_code),
      business_name: validateField('business_name', form.business_name),
      email: validateField('email', form.email),
    };
    Object.keys(errs).forEach((k) => { if (!errs[k]) delete errs[k]; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ business_code: true, business_name: true, email: true });
    if (!validate()) return;
    onSubmit({ ...form, logoFile });
  };

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }));
  };

  const isBusy = loading || uploading;
  const showError = (field) => touched[field] ? errors[field] : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Logo */}
      <div>
        <SectionHeading subtitle="PNG or JPG, up to 5MB">Logo</SectionHeading>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isBusy && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isBusy) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload business logo"
          className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50/60'
              : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-blue-400'
          } ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Logo preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-[var(--text-muted)]" />
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {isDragging ? 'Drop image to upload' : logoPreviewUrl ? 'Change logo' : 'Drag an image here, or click to browse'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {uploading ? 'Uploadingâ€¦' : 'Square images look best'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isBusy}
              className="hidden"
            />
            {uploadError && <FieldError message={uploadError} />}
          </div>

          {logoPreviewUrl && !uploading && (
            <button
              type="button"
              onClick={clearLogo}
              disabled={isBusy}
              aria-label="Remove logo"
              className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Business details */}
      <div>
        <SectionHeading>Business details</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-code`} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Business code <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-code`}
              value={form.business_code}
              onChange={handleChange('business_code')}
              onBlur={handleBlur('business_code')}
              placeholder="e.g. ABC-001"
              maxLength={CODE_MAX}
              aria-invalid={!!showError('business_code')}
              aria-describedby={showError('business_code') ? `${formId}-code-error` : undefined}
              className={`w-full rounded-lg border ${
                showError('business_code') ? 'border-red-500' : 'border-[var(--border)]'
              } bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors`}
            />
            <div className="mt-1 flex items-center justify-between">
              <FieldError id={`${formId}-code-error`} message={showError('business_code')} />
              <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                {form.business_code.length}/{CODE_MAX}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Business name <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-name`}
              value={form.business_name}
              onChange={handleChange('business_name')}
              onBlur={handleBlur('business_name')}
              placeholder="e.g. ABC Corporation"
              maxLength={NAME_MAX}
              aria-invalid={!!showError('business_name')}
              aria-describedby={showError('business_name') ? `${formId}-name-error` : undefined}
              className={`w-full rounded-lg border ${
                showError('business_name') ? 'border-red-500' : 'border-[var(--border)]'
              } bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors`}
            />
            <FieldError id={`${formId}-name-error`} message={showError('business_name')} />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor={`${formId}-desc`} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Description
          </label>
          <textarea
            id={`${formId}-desc`}
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Brief description of the business"
            rows={3}
            maxLength={DESC_MAX}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors resize-none"
          />
          <span className="mt-1 block text-right text-[11px] text-[var(--text-muted)]">
            {form.description.length}/{DESC_MAX}
          </span>
        </div>
      </div>

      {/* Contact */}
      <div>
        <SectionHeading>Contact</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Email
            </label>
            <input
              id={`${formId}-email`}
              value={form.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              placeholder="business@example.com"
              type="email"
              aria-invalid={!!showError('email')}
              aria-describedby={showError('email') ? `${formId}-email-error` : undefined}
              className={`w-full rounded-lg border ${
                showError('email') ? 'border-red-500' : 'border-[var(--border)]'
              } bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors`}
            />
            <FieldError id={`${formId}-email-error`} message={showError('email')} />
          </div>
          <div>
            <label htmlFor={`${formId}-phone`} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Phone
            </label>
            <input
              id={`${formId}-phone`}
              value={form.phone}
              onChange={handleChange('phone')}
              placeholder="+1 (555) 000-0000"
              maxLength={30}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor={`${formId}-address`} className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Address
          </label>
          <textarea
            id={`${formId}-address`}
            value={form.address}
            onChange={handleChange('address')}
            placeholder="Full address"
            rows={2}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors resize-none"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <SectionHeading>Status</SectionHeading>
        <div
          role="radiogroup"
          aria-label="Business status"
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-page)] p-1"
        >
          {[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ].map((opt) => {
            const selected = form.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setForm((prev) => ({ ...prev, status: opt.value }))}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? opt.value === 'active'
                      ? 'bg-green-600 text-white'
                      : 'bg-[var(--text-muted)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Saving…' : initialData ? 'Update business' : 'Create business'}
        </button>
      </div>
    </form>
  );
}