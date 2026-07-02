import type { Assignment, AttendanceRecord, AttendanceStatus, Person, Vehicle, Zone } from './types';

const API_BASE = 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  people: {
    list: () => request<Person[]>('/people'),
    create: (name: string) => request<Person>('/people', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: number, patch: Partial<Pick<Person, 'name' | 'active'>>) =>
      request<Person>(`/people/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    remove: (id: number) => request<void>(`/people/${id}`, { method: 'DELETE' }),
  },
  attendance: {
    range: (start: string, end: string) =>
      request<AttendanceRecord[]>(`/attendance?start=${start}&end=${end}`),
    set: (personId: number, date: string, status: AttendanceStatus) =>
      request<AttendanceRecord>('/attendance', { method: 'PUT', body: JSON.stringify({ personId, date, status }) }),
  },
  zones: {
    list: () => request<Zone[]>('/zones'),
    create: (name: string) => request<Zone>('/zones', { method: 'POST', body: JSON.stringify({ name }) }),
    update: (id: number, name: string) =>
      request<Zone>(`/zones/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
    remove: (id: number) => request<void>(`/zones/${id}`, { method: 'DELETE' }),
  },
  vehicles: {
    create: (name: string, zoneId: number) =>
      request<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify({ name, zoneId }) }),
    update: (id: number, patch: Partial<Pick<Vehicle, 'name' | 'zoneId' | 'inRepair'>>) =>
      request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    remove: (id: number) => request<void>(`/vehicles/${id}`, { method: 'DELETE' }),
  },
  assignments: {
    forDate: (date: string) => request<Assignment[]>(`/assignments?date=${date}`),
    create: (date: string, vehicleId: number, personId: number) =>
      request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify({ date, vehicleId, personId }) }),
    remove: (id: number) => request<void>(`/assignments/${id}`, { method: 'DELETE' }),
  },
  vacations: {
    range: (start: string, end: string) =>
      request<Array<{ id: number; personId: number; dateStart: string; dateEnd: string }>>(
        `/vacations?start=${start}&end=${end}`
      ),
    forPerson: (personId: number) =>
      request<Array<{ id: number; personId: number; dateStart: string; dateEnd: string }>>(
        `/vacations/person/${personId}`
      ),
    create: (personId: number, dateStart: string, dateEnd: string) =>
      request<{ id: number; personId: number; dateStart: string; dateEnd: string }>('/vacations', {
        method: 'POST',
        body: JSON.stringify({ personId, dateStart, dateEnd }),
      }),
    remove: (id: number) => request<void>(`/vacations/${id}`, { method: 'DELETE' }),
  },
};
