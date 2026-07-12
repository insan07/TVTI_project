import api from './api';

export interface SlotInput {
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  start_time: string;
  end_time: string;
  max_students: number;
  equipment_note?: string;
}

// Instructor
export const createPracticeSlots = async (data: { batch_id: string; week_start_date: string; slots: SlotInput[] }) => {
  const response = await api.post('/instructors/practice-slots', data);
  return response.data;
};

export const getMyPracticeSlots = async (params: { batchId?: string; weekStart?: string }) => {
  const response = await api.get('/instructors/practice-slots', { params });
  return response.data;
};

export const updatePracticeSlot = async (slotId: string, data: Partial<{ max_students: number; equipment_note: string; is_open: boolean }>) => {
  const response = await api.patch(`/instructors/practice-slots/${slotId}`, data);
  return response.data;
};

export const getSlotBookings = async (slotId: string) => {
  const response = await api.get(`/instructors/practice-slots/${slotId}/bookings`);
  return response.data;
};

// Student
export const getOpenPracticeSlots = async (params: { batchId: string; weekStart?: string }) => {
  const response = await api.get('/students/practice-slots', { params });
  return response.data;
};

export const bookPracticeSlot = async (slotId: string) => {
  const response = await api.post(`/students/practice-slots/${slotId}/book`);
  return response.data;
};

export const cancelPracticeBooking = async (slotId: string) => {
  const response = await api.delete(`/students/practice-slots/${slotId}/book`);
  return response.data;
};

export const getMyPracticeBookings = async () => {
  const response = await api.get('/students/my-practice-bookings');
  return response.data;
};
