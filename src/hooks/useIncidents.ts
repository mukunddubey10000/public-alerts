import { useState, useEffect, useCallback } from 'react';
import { Location, Incident, Notification } from '../types';
import {
  getCurrentUser,
  updateUserLocation,
  getNearbyIncidents,
  getNotifications,
  markNotificationAsRead,
  sortIncidents,
  DEFAULT_USER_LOCATION,
} from '../services/mockData';

/**
 * Hook to manage user location (GPS + manual override)
 */
export const useLocation = () => {
  const [location, setLocation] = useState<Location>(DEFAULT_USER_LOCATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate GPS polling (in real app, use react-native-geolocation-service)
  useEffect(() => {
    setIsLoading(true);
    // Mock: simulate fetching location
    const timer = setTimeout(() => {
      setLocation(DEFAULT_USER_LOCATION);
      updateUserLocation(DEFAULT_USER_LOCATION);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const updateLocation = useCallback((newLocation: Location) => {
    setLocation(newLocation);
    updateUserLocation(newLocation);
  }, []);

  return { location, isLoading, error, updateLocation };
};

/**
 * Hook to fetch nearby incidents with filtering
 */
export const useNearbyIncidents = (
  userLocation: Location,
  radiusKm: number = 5,
  sortBy: 'distance' | 'recent' | 'upvotes' = 'distance'
) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call delay
    const timer = setTimeout(() => {
      const nearby = getNearbyIncidents(userLocation, radiusKm);
      const sorted = sortIncidents(nearby, sortBy, userLocation);
      setIncidents(sorted);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userLocation, radiusKm, sortBy]);

  return { incidents, isLoading };
};

/**
 * Hook to manage notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const notifs = getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, 1000); // Poll every second for demo

    return () => clearInterval(timer);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  return { notifications, unreadCount, markAsRead };
};

/**
 * Hook to get current user
 */
export const useCurrentUser = () => {
  const user = getCurrentUser();
  return user;
};
