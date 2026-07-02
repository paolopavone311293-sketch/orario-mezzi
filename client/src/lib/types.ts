export interface Person {
  id: number;
  name: string;
  active: number;
}

export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
  personId: number;
  date: string;
  status: AttendanceStatus;
}

export interface Vehicle {
  id: number;
  name: string;
  zoneId: number;
  inRepair: number;
}

export interface Zone {
  id: number;
  name: string;
  vehicles: Vehicle[];
}

export interface Assignment {
  id: number;
  date: string;
  vehicleId: number;
  personId: number;
}
