import { useState, useCallback } from "react";
import { generateFieldId, createDefaultField, reorderFields } from "@/lib/registrationUtils";

export function useRegistrationBuilder(initialFields = []) {
  const [fields, setFields] = useState(initialFields);
  const [activeFieldId, setActiveFieldId] = useState(null);

  const addField = useCallback((type) => {
    const newField = createDefaultField(type);
    setFields((prev) => [...prev, newField]);
    setActiveFieldId(newField.id);
  }, []);

  const updateField = useCallback((id, updates) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const removeField = useCallback(
    (id) => {
      setFields((prev) => prev.filter((f) => f.id !== id));
      if (activeFieldId === id) setActiveFieldId(null);
    },
    [activeFieldId]
  );

  const toggleRequired = useCallback((id) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    );
  }, []);

  const addOption = useCallback((fieldId) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const options = f.options || [];
        return {
          ...f,
          options: [...options, { id: generateFieldId(), label: `Option ${options.length + 1}` }],
        };
      })
    );
  }, []);

  const updateOption = useCallback((fieldId, optionId, label) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          options: f.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
        };
      })
    );
  }, []);

  const removeOption = useCallback((fieldId, optionId) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        return { ...f, options: f.options.filter((o) => o.id !== optionId) };
      })
    );
  }, []);

  const moveField = useCallback((fromIndex, toIndex) => {
    setFields((prev) => reorderFields(prev, fromIndex, toIndex));
  }, []);

  const clearFields = useCallback(() => {
    setFields([]);
    setActiveFieldId(null);
  }, []);

  return {
    fields,
    activeFieldId,
    setActiveFieldId,
    addField,
    updateField,
    removeField,
    toggleRequired,
    addOption,
    updateOption,
    removeOption,
    moveField,
    clearFields,
  };
}