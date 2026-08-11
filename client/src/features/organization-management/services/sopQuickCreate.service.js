import { createSop } from '@/features/sop-management/services/sopService';
import { createModule } from '@/features/sop-management/services/moduleService';
import { createAssignment } from '@/features/sop-management/services/assignmentService';

/**
 * quickCreateSop
 *
 * Inline (file-explorer style) SOP creation: a single title is enough to
 * produce a usable SOP — it gets a default "Main Content" module and, when a
 * department is supplied, an assignment to that department. Returns the new
 * SOP id so the caller can navigate to the editor.
 *
 * Mirrors the minimal behaviour previously inlined in CreateSopModal without
 * the heavy assignment-cascade UI (that flow is intentionally out of scope for
 * inline naming).
 */
export async function quickCreateSop({ title, departmentId = null, categoryId = null }) {
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) {
    throw new Error('SOP title is required');
  }

  const { data: sopData } = await createSop({
    title: trimmedTitle,
    description: '',
    department_id: departmentId,
    category_id: categoryId,
    status: 'Draft',
    restriction_type: departmentId ? 'assigned' : 'public',
  });

  const sopId = sopData?.data?.id || sopData?.id;
  if (!sopId) {
    throw new Error('SOP creation failed');
  }

  // A new SOP needs at least one module to be editable.
  await createModule(sopId, {
    title: 'Main Content',
    content: '',
    sort_order: 1,
  });

  // Scope the SOP to its owning department when known (folder -> file).
  if (departmentId) {
    await createAssignment(sopId, {
      department_ids: [departmentId],
      position_names: [],
      user_ids: [],
      due_date: null,
      notes: '',
    });
  }

  return sopId;
}

export default quickCreateSop;
