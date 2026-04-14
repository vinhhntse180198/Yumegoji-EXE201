import http from './client';

export const learnAiApi = {
  postChat: (body) =>
    http.post('/api/learn/ai/chat', body, {
      timeout: 180_000,
    }),

  extractDocument: (formData) =>
    http.post('/api/learn/ai/extract-document', formData, {
      timeout: 120_000,
      transformRequest: [
        (body, headers) => {
          if (headers && typeof headers.delete === 'function') {
            headers.delete('Content-Type');
          } else if (headers) {
            delete headers['Content-Type'];
          }
          return body;
        },
      ],
    }),
};
