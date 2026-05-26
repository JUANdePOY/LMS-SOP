import { Users, Calendar, MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { shortDate, formatFileSize, formatDateShort } from '@/lib/dateUtils';
import { getInternalTrainingById, getInternalTrainingAttachments, downloadInternalAttachment } from '@/services/trainingsService';
import AttachmentIcon from '@/components/ui/AttachmentIcon';
import ViewAttachmentModal from '@/components/ui/ViewAttachmentModal';

const ParticipantsTable = ({ participants, loading }) => {
  if (loading) {
    return <p className="mt-1 text-neutral-600 dark:text-neutral-400">Loading participants...</p>;
  }

  if (!participants || participants.length === 0) {
    return <p className="mt-1 text-neutral-600 dark:text-neutral-400">No participants registered yet.</p>;
  }

  return (
    <div className="mt-2 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Name</th>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Rank</th>
            <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Squadron</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {participants.map((p) => (
            <tr key={p.id || p.email} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{p.name}</td>
              <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{p.rank || '-'}</td>
              <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{p.squadron_name || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function TrainingDetailsModal({ training, isOpen, onClose }) {
  const [fullTraining, setFullTraining] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [viewModal, setViewModal] = useState({ isOpen: false, file: null, fileName: '', fileType: '' });

  useEffect(() => {
    if (isOpen && training) {
      setLoading(true);
      const trainingId = training.id ?? training.training_id;
      if (!trainingId) {
        setFullTraining(training);
        setLoading(false);
        return;
      }
      getInternalTrainingById(trainingId)
        .then(result => {
          if (result.success && result.data) {
            setFullTraining(result.data);
          } else {
            setFullTraining(training);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, training]);

  useEffect(() => {
    if (isOpen && fullTraining) {
      const trainingId = fullTraining.id ?? fullTraining.training_id;
      if (!trainingId) return;
      setLoadingAttachments(true);
      setAttachmentError("");
      getInternalTrainingAttachments(trainingId)
        .then(result => {
          if (result.success) {
            setAttachments(result.data || []);
          } else {
            setAttachmentError(result.message);
          }
        })
        .catch(err => {
          setAttachmentError(err.message || "Failed to load attachments");
        })
        .finally(() => setLoadingAttachments(false));
    }
  }, [isOpen, fullTraining]);

  if (!isOpen) return null;

  const trainingData = fullTraining || training;
  const participantCount = trainingData.participant_count ?? trainingData.participants?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">Internal Training</span>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{trainingData.title || 'Untitled Training'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Description</p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-300">{trainingData.description || 'No description available.'}</p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {shortDate(trainingData.start_datetime || trainingData.start_date)} - {shortDate(trainingData.end_datetime || trainingData.end_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{trainingData.location || trainingData.venue || 'Location not set'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{participantCount} participants</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Participants</p>
              <ParticipantsTable participants={trainingData.participants} loading={loading} />
            </div>
          </div>
        </div>

{(attachments.length > 0 || loadingAttachments || attachmentError) && (
           <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
             <div className="space-y-4">
               <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                 Attachments
               </p>
               {loadingAttachments ? (
                 <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                   Loading attachments...
                 </p>
               ) : attachmentError ? (
                 <p className="mt-1 text-xs text-red-500">{attachmentError}</p>
               ) : attachments.length === 0 ? (
                 <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                   No attachments available.
                 </p>
               ) : (
                 <div className="space-y-2">
                   {attachments.map((attachment) => {
                     const fileExt = (attachment.original_filename || attachment.name || '').split('.').pop() || '';
                     return (
                       <div key={attachment.id} className="flex items-center gap-3 p-2 rounded-lg border border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                         <div className="flex-shrink-0">
                           <AttachmentIcon fileType={fileExt} />
                         </div>
                         <div className="flex-1 space-y-1">
                           <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={attachment.original_filename || attachment.name}>
                             {attachment.original_filename || attachment.name}
                           </p>
                           <p className="text-xs text-neutral-500 dark:text-neutral-400">
                             {formatFileSize(attachment.size_bytes)}
                             {attachment.created_at && ` • ${formatDateShort(attachment.created_at)}`}
                           </p>
                         </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const trainingId = fullTraining?.id ?? fullTraining?.training_id;
                              const result = await downloadInternalAttachment(trainingId, attachment.id);
                              if (result.success && result.data) {
                                setViewModal({ isOpen: true, file: result.data, fileName: attachment.original_filename || attachment.name, fileType: fileExt });
                              } else {
                                setAttachmentError(result.message || 'Failed to download attachment');
                              }
                            }}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                          >
                            View
                          </button>
                       </div>
                     );
                   })}
                 </div>
               )}
             </div>
           </div>
         )}

        <ViewAttachmentModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal({ isOpen: false, file: null, fileName: '', fileType: '' })}
          file={viewModal.file}
          fileName={viewModal.fileName}
          fileType={viewModal.fileType}
        />
       </div>
     </div>
   );
}