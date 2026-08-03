import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { SIGNATURE_TYPES } from '@/features/certificate-management/constants/certificateSections';

export default function SignatureSlotManager({ slots = [], signatures = [], onChange, readonly = false }) {
  const [selectedId, setSelectedId] = useState('');

  const handleAdd = () => {
    if (!selectedId) return;
    const sig = signatures.find(s => String(s.id) === String(selectedId));
    if (!sig) return;
    const newSlot = {
      signature_id: sig.id,
      label: sig.label,
      type: sig.type,
      filename: sig.filename,
      storage_path: sig.storage_path,
    };
    onChange([...slots, newSlot]);
    setSelectedId('');
  };

  const handleRemove = (index) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const availableSignatures = signatures.filter(
    sig => !slots.some(slot => String(slot.signature_id) === String(sig.id))
  );

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Signature & Seal Slots</h4>
        <span className="text-xs text-gray-500">{slots.length} slot(s)</span>
      </div>

      {slots.length > 0 && (
        <div className="space-y-2">
          {slots.map((slot, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <img
                  src={`/uploads/${slot.storage_path}`}
                  alt={slot.label}
                  className="h-8 w-16 rounded object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div>
                  <p className="text-sm font-medium">{slot.label}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {SIGNATURE_TYPES[slot.type]?.label || slot.type}
                    </Badge>
                  </div>
                </div>
              </div>
              {!readonly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readonly && (
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Select a signature or seal...</option>
            {availableSignatures.map(sig => (
              <option key={sig.id} value={sig.id}>
                {sig.label} ({SIGNATURE_TYPES[sig.type]?.label || sig.type})
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!selectedId}
          >
            Add
          </Button>
        </div>
      )}
    </Card>
  );
}
