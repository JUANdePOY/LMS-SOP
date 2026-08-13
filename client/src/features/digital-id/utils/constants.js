export const LINK_TYPES = [
  { value: 'website', label: 'Website', placeholder: 'https://example.com', icon: '🌐' },
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username', icon: '💼' },
  { value: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/username', icon: '🐦' },
  { value: 'github', label: 'GitHub', placeholder: 'https://github.com/username', icon: '💻' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/username', icon: '👤' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username', icon: '📷' },
];

export const STORAGE_KEY = 'digital_id_links';

export const createEmptyLink = () => ({
  id: crypto.randomUUID(),
  type: 'website',
  label: '',
  url: '',
});
