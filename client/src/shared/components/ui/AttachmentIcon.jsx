import { FileText, FileImage, FileSpreadsheet, FileArchive, File } from 'lucide-react';

const iconMap = {
  pdf: { icon: FileText, color: 'text-red-500' },
  doc: { icon: FileText, color: 'text-blue-500' },
  docx: { icon: FileText, color: 'text-blue-500' },
  xls: { icon: FileSpreadsheet, color: 'text-emerald-500' },
  xlsx: { icon: FileSpreadsheet, color: 'text-emerald-500' },
  ppt: { icon: FileText, color: 'text-orange-500' },
  pptx: { icon: FileText, color: 'text-orange-500' },
  jpg: { icon: FileImage, color: 'text-purple-500' },
  jpeg: { icon: FileImage, color: 'text-purple-500' },
  png: { icon: FileImage, color: 'text-purple-500' },
  gif: { icon: FileImage, color: 'text-purple-500' },
  zip: { icon: FileArchive, color: 'text-yellow-500' },
  rar: { icon: FileArchive, color: 'text-yellow-500' },
};

export default function AttachmentIcon({ fileType, size = 16 }) {
  const normalizedType = (fileType || '').toLowerCase().replace(/^\./, '');
  const config = iconMap[normalizedType] || { icon: File, color: 'text-neutral-400' };
  const IconComponent = config.icon;
  return <IconComponent size={size} className={config.color} />;
}