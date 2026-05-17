import { useState, useCallback, useRef } from "react";
import { generateFieldId, createDefaultField, reorderFields } from "@/lib/registrationUtils";

export function useRegistrationBuilder(initialFields = [], onChange) {
  const fieldsRef = useRef(initialFields);
  const [fields, setFields] = useState(initialFields);
  const [activeFieldId, setActiveFieldId] = useState(null);

  const addField = useCallback((type) => {
    setFields((prev) => {
      const newField = createDefaultField(type);
      const next = [...prev, newField];
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      setActiveFieldId(newField.id);
      return next;
    });
  }, []);

  const updateField = useCallback((id, updates) => {
    setFields((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      return next;
    });
  }, []);

  const removeField = useCallback(
    (id) => {
      setFields((prev) => {
        const next = prev.filter((f) => f.id !== id);
        fieldsRef.current = next;
        queueMicrotask(() => onChange?.(next));
        if (activeFieldId === id) setActiveFieldId(null);
        return next;
      });
    },
    [activeFieldId]
  );

  const toggleRequired = useCallback((id) => {
    setFields((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f));
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      return next;
    });
  }, []);

  const addOption = useCallback((fieldId) => {
    setFields((prev) => {
      const next = prev.map((f) => {
        if (f.id !== fieldId) return f;
        const options = f.options || [];
        return {
          ...f,
          options: [...options, { id: generateFieldId(), label: `Option ${options.length + 1}` }],
        };
      });
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      return next;
    });
  }, []);

  const updateOption = useCallback((fieldId, optionId, label) => {
    setFields((prev) => {
      const next = prev.map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          options: f.options.map((o) => (o.id === optionId ? { ...o, label } : o)),
        };
      });
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      return next;
    });
  }, []);

  const removeOption = useCallback((fieldId, optionId) => {
    setFields((prev) => {
      const next = prev.map((f) => {
        if (f.id !== fieldId) return f;
        return { ...f, options: f.options.filter((o) => o.id !== optionId) };
      });
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      return next;
    });
  }, []);

  const moveField = useCallback((fromIndex, toIndex) => {
    setFields((prev) => {
      const next = reorderFields(prev, fromIndex, toIndex);
      fieldsRef.current = next;
      queueMicrotask(() => onChange?.(next));
      return next;
    });
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