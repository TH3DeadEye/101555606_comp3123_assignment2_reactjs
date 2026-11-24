// Shapes of the data exchanged with the backend (see the README for the API).

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  // Exactly one of username / email is sent, depending on what the user typed.
  username?: string;
  email?: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  user: AuthUser;
}

export interface Employee {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  salary: number;
  // ISO timestamp at midnight UTC, for example 2024-03-01T00:00:00.000Z
  date_of_joining: string;
  // Path such as /uploads/<uuid>.png, or null when there is no picture
  profile_picture: string | null;
  user: string;
  created_at: string;
  updated_at: string;
}

// What the employee form collects. Everything is text because that is what
// form inputs (and multipart/form-data) carry; the backend converts it.
export interface EmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department: string;
  salary: string;
  date_of_joining: string; // YYYY-MM-DD
}

export interface SearchParams {
  department?: string;
  position?: string;
}

// The error body every failed API call returns.
export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  status: 'error';
  code: string;
  message: string;
  errors?: FieldError[];
  retry_after_seconds?: number;
}
