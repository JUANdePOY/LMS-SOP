export const downloadFile = (attachment) => {
  if (!attachment?.storage_path) return;
  const link = document.createElement('a');
  link.href = `/api/${attachment.storage_path}`;
  link.download = attachment.original_name || attachment.file_name || 'attachment';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
