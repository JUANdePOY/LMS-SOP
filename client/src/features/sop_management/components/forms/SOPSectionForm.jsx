import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SECTION_TYPE, SECTION_TYPE_LABELS, SECTION_TYPE_LIST } from '../../constants/sectionTypes';
import { validateSection } from '../../validators/section.validator';

const PRESET_TYPES = SECTION_TYPE_LIST.filter((type) => type !== SECTION_TYPE.CUSTOM);

export default function SOPSectionForm({ sections, onCreate, onUpdate, onRemove, saving }) {
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [addError, setAddError] = useState(null);

  const findSection = (type) => sections.find((s) => s.section_type === type);

  const handlePresetContentChange = async (type, content) => {
    const existing = findSection(type);
    const title = SECTION_TYPE_LABELS[type];

    if (existing) {
      onUpdate(existing.id, { content });
    } else {
      const { isValid, errors } = validateSection({ title });
      if (!isValid) {
        setRowErrors((prev) => ({ ...prev, [type]: errors.title }));
        return;
      }
      setRowErrors((prev) => ({ ...prev, [type]: undefined }));
      onCreate({
        section_type: type,
        title,
        content,
        order_index: PRESET_TYPES.indexOf(type),
      });
    }
  };

  const handleAddCustom = async () => {
    setAddError(null);
    const { isValid, errors } = validateSection({ title: customTitle });
    if (!isValid) {
      setAddError(errors.title);
      return;
    }

    try {
      await onCreate({
        section_type: SECTION_TYPE.CUSTOM,
        title: customTitle.trim(),
        content: customContent,
        order_index: sections.length,
      });
      setCustomTitle('');
      setCustomContent('');
    } catch (err) {
      setAddError(err?.response?.data?.message || err?.message || 'Unable to add section');
    }
  };

  const customSections = sections.filter((s) => s.section_type === SECTION_TYPE.CUSTOM);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Content</th>
              <th className="w-16 px-4 py-2">Order</th>
              <th className="w-16 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {PRESET_TYPES.map((type, index) => {
              const existing = findSection(type);
              return (
                <tr key={type}>
                  <td className="px-4 py-2 font-medium text-foreground">{SECTION_TYPE_LABELS[type]}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      defaultValue={existing?.content || ''}
                      onBlur={(e) => handlePresetContentChange(type, e.target.value)}
                      placeholder={`Enter ${SECTION_TYPE_LABELS[type].toLowerCase()}...`}
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    {rowErrors[type] && <p className="mt-1 text-xs text-destructive">{rowErrors[type]}</p>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-2">
{existing && (
                      <Button variant="ghost" size="icon" onClick={() => onRemove(existing.id)} disabled={saving} title="Remove section">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}

            {customSections.map((section, index) => (
              <tr key={section.id}>
                <td className="px-4 py-2 font-medium text-foreground">{section.title}</td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={section.content || ''}
                    onBlur={(e) => onUpdate(section.id, { content: e.target.value })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </td>
                <td className="px-4 py-2 text-muted-foreground">{PRESET_TYPES.length + index + 1}</td>
                <td className="px-4 py-2">
<Button variant="ghost" size="icon" onClick={() => onRemove(section.id)} disabled={saving} title="Remove section">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--border)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Custom section title"
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-48"
          />
          <input
            type="text"
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder="Content"
            className="w-full flex-1 rounded border border-[var(--border)] bg-[var(--bg-input)] text-foreground placeholder:text-muted-foreground px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" onClick={handleAddCustom} disabled={saving}>
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </div>
        {addError && <p className="mt-1 text-xs text-destructive">{addError}</p>}
      </div>
    </div>
  );
}