import { Incident, Location, User, Notification } from '../types';
import { getDistanceKm, isWithinRadius } from '../utils/geo';

/**
 * Mock Data Layer - simulates backend + database
 * In production, replace with real API calls & Firebase/Database
 */

// Default user location (e.g., Bangalore, India)
export const DEFAULT_USER_LOCATION: Location = {
  lat: 12.9716,
  lng: 77.5946,
};

// Current user mock
const CURRENT_USER: User = {
  id: Math.random().toString(36).substr(2, 9),
  name: 'John Doe',
  location: DEFAULT_USER_LOCATION,
  notificationRadius: 5, // 5 km
  fcmToken: 'mock_fcm_token',
};

// Mock incidents database
let INCIDENTS_DB: Incident[] = [
  {
    id: Math.random().toString(36).substr(2, 9),
    type: 'ACCIDENT',
    description: 'Car collision on MG Road near Vidhana Soudha',
    location: { lat: 12.9747, lng: 77.5906 },
    createdAt: Date.now() - 15 * 60000, // 15 min ago
    createdBy: 'user_123',
    upvotes: 12,
    status: 'ACTIVE',
  },
  {
    id: Math.random().toString(36).substr(2, 9),
    type: 'OUTAGE',
    description: 'Power cut in Koramangala Block 1 and 2',
    location: { lat: 12.9352, lng: 77.6245 },
    createdAt: Date.now() - 30 * 60000, // 30 min ago
    createdBy: 'user_456',
    upvotes: 8,
    status: 'ACTIVE',
  },
  {
    id: Math.random().toString(36).substr(2, 9),
    type: 'CONSTRUCTION',
    description: 'Road work on Sarjapur Road - expect delays',
    location: { lat: 12.9095, lng: 77.6277 },
    createdAt: Date.now() - 2 * 60 * 60000, // 2 hours ago
    createdBy: 'user_789',
    upvotes: 5,
    status: 'ACTIVE',
  },
  {
    id: Math.random().toString(36).substr(2, 9),
    type: 'HAZARD',
    description: 'Potholes on Whitefield Road causing accidents',
    location: { lat: 12.9698, lng: 77.7499 },
    createdAt: Date.now() - 45 * 60000, // 45 min ago
    createdBy: 'user_101',
    upvotes: 18,
    status: 'ACTIVE',
  },
  {
    id: Math.random().toString(36).substr(2, 9),
    type: 'ACCIDENT',
    description: 'Two wheeler accident near Indiranagar',
    location: { lat: 12.9716, lng: 77.6412 },
    createdAt: Date.now() - 5 * 60000, // 5 min ago
    createdBy: 'user_202',
    upvotes: 3,
    status: 'ACTIVE',
  },
  {
    id: Math.random().toString(36).substr(2, 9),
    type: 'OUTAGE',
    description: 'Water supply disruption in Marathahalli',
    location: { lat: 12.9689, lng: 77.6994 },
    createdAt: Date.now() - 1 * 60 * 60000, // 1 hour ago
    createdBy: 'user_303',
    upvotes: 6,
    status: 'ACTIVE',
  },
];

// Mock notifications
let NOTIFICATIONS_DB: Notification[] = [];

/**
 * Get all active incidents
 */
export const getAllIncidents = (): Incident[] => {
  return INCIDENTS_DB.filter(i => i.status === 'ACTIVE');
};

/**
 * Get incidents near user (within radius)
 */
export const getNearbyIncidents = (
  userLocation: Location,
  radiusKm: number = 5
): Incident[] => {
  return INCIDENTS_DB.filter(
    i => i.status === 'ACTIVE' && isWithinRadius(userLocation, i.location, radiusKm)
  );
};

/**
 * Get incidents filtered by type
 */
export const getIncidentsByType = (
  types: Incident['type'][],
  userLocation?: Location,
  radiusKm?: number
): Incident[] => {
  let filtered = INCIDENTS_DB.filter(
    i => i.status === 'ACTIVE' && types.includes(i.type)
  );
  if (userLocation && radiusKm !== undefined) {
    filtered = filtered.filter(i =>
      isWithinRadius(userLocation, i.location, radiusKm)
    );
  }
  return filtered;
};

/**
 * Get incident by ID
 */
export const getIncidentById = (id: string): Incident | undefined => {
  return INCIDENTS_DB.find(i => i.id === id);
};

/**
 * Create a new incident (simulates POST /incidents)
 */
export const createIncident = (
  type: Incident['type'],
  description: string,
  location: Location,
  imageUrl?: string
): Incident => {
  const newIncident: Incident = {
    id: Math.random().toString(36).substr(2, 9),
    type,
    description,
    location,
    createdAt: Date.now(),
    createdBy: CURRENT_USER.id,
    upvotes: 1, // Auto-upvote by creator
    status: 'ACTIVE',
    imageUrl,
  };
  INCIDENTS_DB.push(newIncident);

  // Simulate notification to nearby users
  simulateNotificationTrigger(newIncident);

  return newIncident;
};

/**
 * Upvote an incident
 */
export const upvoteIncident = (incidentId: string): void => {
  const incident = INCIDENTS_DB.find(i => i.id === incidentId);
  if (incident) {
    incident.upvotes += 1;
  }
};

/**
 * Mark incident as expired
 */
export const expireIncident = (incidentId: string): void => {
  const incident = INCIDENTS_DB.find(i => i.id === incidentId);
  if (incident) {
    incident.status = 'EXPIRED';
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): User => {
  return CURRENT_USER;
};

/**
 * Update user location
 */
export const updateUserLocation = (location: Location): void => {
  CURRENT_USER.location = location;
};

/**
 * Get notifications for current user
 */
export const getNotifications = (): Notification[] => {
  return NOTIFICATIONS_DB;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = (notificationId: string): void => {
  const notif = NOTIFICATIONS_DB.find(n => n.id === notificationId);
  if (notif) {
    notif.read = true;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = (): number => {
  return NOTIFICATIONS_DB.filter(n => !n.read).length;
};

/**
 * Simulate FCM notification trigger (in real app, backend would send this)
 */
const simulateNotificationTrigger = (incident: Incident): void => {
  // Check if current user is within notification radius
  if (
    isWithinRadius(
      CURRENT_USER.location,
      incident.location,
      CURRENT_USER.notificationRadius
    )
  ) {
    const distance = getDistanceKm(CURRENT_USER.location, incident.location);
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title: `New ${incident.type} near you (${distance.toFixed(1)} km away)`,
      body: incident.description || `A ${incident.type} has been reported`,
      incidentId: incident.id,
      timestamp: Date.now(),
      read: false,
    };
    NOTIFICATIONS_DB.unshift(notification); // Add to top

    console.log('📢 Notification triggered:', notification);
  }
};

/**
 * Sort incidents by criteria
 */
export const sortIncidents = (
  incidents: Incident[],
  sortBy: 'distance' | 'recent' | 'upvotes',
  userLocation?: Location
): Incident[] => {
  const copy = [...incidents];
  if (sortBy === 'recent') {
    return copy.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortBy === 'upvotes') {
    return copy.sort((a, b) => b.upvotes - a.upvotes);
  } else if (sortBy === 'distance' && userLocation) {
    return copy.sort(
      (a, b) =>
        getDistanceKm(userLocation, a.location) -
        getDistanceKm(userLocation, b.location)
    );
  }
  return copy;
};

/**
 * Get trending incidents (high upvotes in last 2 hours)
 */
export const getTrendingIncidents = (
  userLocation?: Location,
  radiusKm?: number
): Incident[] => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60000;
  let filtered = INCIDENTS_DB.filter(
    i => i.status === 'ACTIVE' && i.createdAt > twoHoursAgo && i.upvotes >= 5
  );
  if (userLocation && radiusKm !== undefined) {
    filtered = filtered.filter(i =>
      isWithinRadius(userLocation, i.location, radiusKm)
    );
  }
  return filtered.sort((a, b) => b.upvotes - a.upvotes);
};
