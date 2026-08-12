import api from '@/services/api';

export const listCourseCertificates = (courseId) =>
  api.get(`/certificate-courses/courses/${courseId}/certificates`);

export const linkCertificateToCourse = (courseId, templateId, meta = {}) =>
  api.post(`/certificate-courses/courses/${courseId}/certificates`, {
    template_id: templateId,
    is_default: meta.is_default ?? false,
    display_order: meta.display_order ?? 0,
  });

export const unlinkCertificateFromCourse = (courseId, templateId) =>
  api.delete(`/certificate-courses/courses/${courseId}/certificates/${templateId}`);
