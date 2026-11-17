/*
 * Mock users. This is a stand-in for authentication so the app can be personalised: any
 * non-empty password is accepted and nothing here protects the data.
 */
import type { HotelId, Insight } from './types';

export const ROLES = ['general_manager', 'revenue_director', 'fnb_manager'] as const;
export type Role = (typeof ROLES)[number];

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  roleLabel: string;
  /** The hotel selected when the user signs in */
  defaultHotelId: HotelId;
  initials: string;
}

export const users: UserProfile[] = [
  {
    id: 'mark',
    email: 'mark@pulse.com',
    firstName: 'Mark',
    lastName: 'Devos',
    role: 'general_manager',
    roleLabel: 'General Manager',
    defaultHotelId: 'hotel-central',
    initials: 'MD',
  },
  {
    id: 'sofia',
    email: 'sofia@pulse.com',
    firstName: 'Sofia',
    lastName: 'Marques',
    role: 'revenue_director',
    roleLabel: 'Revenue Director',
    defaultHotelId: 'marina-resort',
    initials: 'SM',
  },
  {
    id: 'tomas',
    email: 'tomas@pulse.com',
    firstName: 'Tomas',
    lastName: 'Ferreira',
    role: 'fnb_manager',
    roleLabel: 'F&B Manager',
    defaultHotelId: 'marina-resort',
    initials: 'TF',
  },
];

/** How much more each role cares about an insight category; categories not listed count as 1. */
export const roleCategoryWeights: Record<Role, Partial<Record<Insight['category'], number>>> = {
  general_manager: { profit: 1.5, staffing: 1.2 },
  revenue_director: { bookings: 1.5, channels: 1.5 },
  fnb_manager: { restaurant: 1.5 },
};

export const categoryWeight = (role: Role | undefined, category: Insight['category']): number =>
  (role && roleCategoryWeights[role][category]) ?? 1;

/** The user for an email (case-insensitive), as long as some password was given. */
export function authenticate(email: unknown, password: unknown): UserProfile | undefined {
  if (typeof email !== 'string' || typeof password !== 'string' || password === '') {
    return undefined;
  }
  const wanted = email.trim().toLowerCase();
  return users.find((user) => user.email === wanted);
}

/** The first word of a greeting for the time of day. */
export function greeting(date: Date): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = date.getHours();
  if (hour < 12) return 'Morning';
  return hour < 18 ? 'Afternoon' : 'Evening';
}
