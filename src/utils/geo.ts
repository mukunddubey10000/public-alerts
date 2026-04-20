import { Location } from '../types';

/**
 * Convert degrees to radians
 */
export const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Haversine formula: calculate distance between two lat/lng points in km
 */
export const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Calculate distance between two Location objects
 */
export const getDistanceKm = (loc1: Location, loc2: Location): number => {
  return haversineDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
};

/**
 * Check if a location is within a radius (km) of another location
 */
export const isWithinRadius = (
  userLoc: Location,
  incidentLoc: Location,
  radiusKm: number
): boolean => {
  return getDistanceKm(userLoc, incidentLoc) <= radiusKm;
};

/**
 * Convert km to degrees (latitude)
 */
export const kmToDegLat = (km: number): number => km / 110.574;

/**
 * Convert km to degrees (longitude, depends on latitude)
 */
export const kmToDegLng = (km: number, lat: number): number => {
  return km / (111.32 * Math.cos(toRad(lat)));
};

/**
 * Get bounding box for a location and radius (for efficient filtering)
 */
export const getBoundingBox = (center: Location, radiusKm: number) => {
  const dLat = kmToDegLat(radiusKm);
  const dLng = kmToDegLng(radiusKm, center.lat);
  return {
    minLat: center.lat - dLat,
    maxLat: center.lat + dLat,
    minLng: center.lng - dLng,
    maxLng: center.lng + dLng,
  };
};
