import http from './client';

const BASE = '/api/moderator/lessons/import';

const formDataTransform = [
  (body, headers) => {
    if (body instanceof FormData && headers) {
      if (typeof headers.delete === 'function') headers.delete('Content-Type');
      else delete headers['Content-Type'];
    }
    return body;
  },
];

export const lessonImportApi = {
  extractText: (formData) =>
    http.post(`${BASE}/extract-text`, formData, {
      timeout: 300000,
      transformRequest: formDataTransform,
    }),

  generateDraft: (formData) =>
    http.post(`${BASE}/generate-draft`, formData, {
      timeout: 600000,
      transformRequest: formDataTransform,
    }),

  createFromDraft: (payload) => http.post(`${BASE}/create-from-draft`, payload),
};
