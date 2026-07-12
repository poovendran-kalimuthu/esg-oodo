import api from './axiosInstance';

export const csrApi = {
  list:            (params) => api.get('/csr', { params }),
  getById:         (id) => api.get(`/csr/${id}`),
  create:          (data) => api.post('/csr', data),
  update:          (id, data) => api.put(`/csr/${id}`, data),
  delete:          (id) => api.delete(`/csr/${id}`),
  updateStatus:    (id, status) => api.patch(`/csr/${id}/status`, { status }),
  uploadBanner:    (id, file) => {
    const fd = new FormData();
    fd.append('banner', file);
    return api.post(`/csr/${id}/banner`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getParticipants: (id, params) => api.get(`/csr/${id}/participants`, { params }),
};

export const participationApi = {
  getMy:      (params) => api.get('/participation', { params }),
  register:   (csrActivityId) => api.post('/participation', { csrActivityId }),
  withdraw:   (id) => api.delete(`/participation/${id}`),
  uploadProof:(id, file) => {
    const fd = new FormData();
    fd.append('proof', file);
    return api.post(`/participation/${id}/proof`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getManaged: (params) => api.get('/participation/manage', { params }),
  review:     (id, data) => api.patch(`/participation/${id}/review`, data),
};

export const trainingApi = {
  list:            (params) => api.get('/training', { params }),
  getMy:           (params) => api.get('/training/my', { params }),
  getDashboard:    () => api.get('/training/dashboard'),
  getById:         (id) => api.get(`/training/${id}`),
  create:          (data) => api.post('/training', data),
  assign:          (id, userIds) => api.post(`/training/${id}/assign`, { userIds }),
  updateProgress:  (id, completedModules) => api.patch(`/training/completion/${id}`, { completedModules }),
};

export const diversityApi = {
  list:      (params) => api.get('/diversity', { params }),
  dashboard: () => api.get('/diversity/dashboard'),
  score:     () => api.get('/diversity/score'),
  save:      (data) => api.post('/diversity', data),
};

export const feedbackApi = {
  submit:     (data) => api.post('/feedback', data),
  getMy:      (params) => api.get('/feedback/my', { params }),
  getAll:     (params) => api.get('/feedback', { params }),
  getById:    (id) => api.get(`/feedback/${id}`),
  updateStatus:(id, data) => api.patch(`/feedback/${id}/status`, data),
  assign:     (id, assignedToId) => api.patch(`/feedback/${id}/assign`, { assignedToId }),
};

export const socialApi = {
  dashboard:    () => api.get('/social/dashboard'),
  participation:() => api.get('/social/charts/participation'),
  departments:  () => api.get('/social/charts/departments'),
  volunteer:    () => api.get('/social/charts/volunteer'),
  diversity:    () => api.get('/social/charts/diversity'),
  training:     () => api.get('/social/charts/training'),
  upcoming:     () => api.get('/social/upcoming'),
  recent:       () => api.get('/social/recent'),
};

export const reportsApi = {
  csr:         (params) => api.get('/reports/csr', { params }),
  participation:(params) => api.get('/reports/participation', { params }),
  training:    (params) => api.get('/reports/training', { params }),
  diversity:   (params) => api.get('/reports/diversity', { params }),
  socialScore: () => api.get('/reports/social-score'),
};

export const notificationsApi = {
  list:       (params) => api.get('/notifications', { params }),
  unreadCount:() => api.get('/notifications/unread-count'),
  markRead:   (id) => api.patch(`/notifications/${id}/read`),
  markAllRead:() => api.patch('/notifications/read-all'),
};

export const gamificationApi = {
  leaderboard: (params) => api.get('/gamification/leaderboard', { params }),
  myXP:        () => api.get('/gamification/my-xp'),
  badges:      () => api.get('/gamification/badges'),
  myBadges:    () => api.get('/gamification/my-badges'),
};
