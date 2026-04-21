import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, PermissionsAndroid, Alert, Linking } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { Location, Incident, Notification } from "../types";
import {
  getCurrentUser,
  updateUserLocation,
  getNearbyIncidents,
  getNotifications,
  markNotificationAsRead,
  sortIncidents,
  DEFAULT_USER_LOCATION,
} from "../services/mockData";

/**
 * Request location permission on Android
 */
const requestAndroidPermission = async (): Promise<boolean> => {
  try {
    const fineGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "CivicAlerts Location Permission",
        message:
          "CivicAlerts needs access to your location to show nearby incidents and alerts.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      },
    );
    return fineGranted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn("Location permission error:", err);
    return false;
  }
};

/**
 * Request location permission (cross-platform)
 */
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    return requestAndroidPermission();
  }
  // iOS: permissions handled via Info.plist, Geolocation triggers the prompt
  return true;
};

/**
 * Hook to manage user location with real GPS tracking
 */
export const useLocation = () => {
  const [location, setLocation] = useState<Location>(DEFAULT_USER_LOCATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const startLocationTracking = async () => {
      const hasPermission = await requestLocationPermission();

      if (!hasPermission) {
        if (mounted) {
          setError("Location permission denied");
          setIsLoading(false);
          Alert.alert(
            "Location Required",
            "CivicAlerts needs your location to show nearby incidents. Please enable location access in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
        }
        return;
      }

      // Get current position first (one-shot)
      Geolocation.getCurrentPosition(
        (position) => {
          if (mounted) {
            const newLoc: Location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setLocation(newLoc);
            updateUserLocation(newLoc);
            setIsLoading(false);
            setError(null);
          }
        },
        (err) => {
          console.warn("getCurrentPosition error:", err);
          if (mounted) {
            // Fall back to default location
            setLocation(DEFAULT_USER_LOCATION);
            updateUserLocation(DEFAULT_USER_LOCATION);
            setError(err.message);
            setIsLoading(false);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );

      // Watch position for continuous updates
      watchIdRef.current = Geolocation.watchPosition(
        (position) => {
          if (mounted) {
            const newLoc: Location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setLocation(newLoc);
            updateUserLocation(newLoc);
            setError(null);
          }
        },
        (err) => {
          console.warn("watchPosition error:", err);
          if (mounted) {
            setError(err.message);
          }
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 50, // Update every 50 meters
          interval: 10000, // Android: check every 10s
          fastestInterval: 5000,
        },
      );
    };

    startLocationTracking();

    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
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
  sortBy: "distance" | "recent" | "upvotes" = "distance",
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
      setUnreadCount(notifs.filter((n) => !n.read).length);
    }, 1000); // Poll every second for demo

    return () => clearInterval(timer);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
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
