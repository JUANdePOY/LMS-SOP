export default function SOPBasicInfoForm({ formData, onChange, errors = {} }) {
  const handleChange = (field) => (event) => {
    const value = event.target.value;
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sop-title">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="sop-title"
          type="text"
          value={formData.title}
          onChange={handleChange('title')}
          placeholder="e.g. Fire Evacuation Procedure"
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.title ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sop-code">
          Code
        </label>
        <input
          id="sop-code"
          type="text"
          value={formData.code}
          onChange={handleChange('code')}
          placeholder="Leave blank to auto-generate"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sop-description">
          Description
        </label>
        <textarea
          id="sop-description"
          rows={3}
          value={formData.description}
          onChange={handleChange('description')}
          placeholder="What is this SOP for?"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sop-department">
            Department ID
          </label>
          <input
            id="sop-department"
            type="number"
            value={formData.department_id}
            onChange={handleChange('department_id')}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sop-category">
            Category ID
          </label>
          <input
            id="sop-category"
            type="number"
            value={formData.category_id}
            onChange={handleChange('category_id')}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        New SOPs always start as <span className="font-medium">Draft</span>. Status changes happen through the review workflow.
      </p>
    </div>
  );
}