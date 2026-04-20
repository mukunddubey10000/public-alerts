export interface ButtonProps {
  text: string;
  onPress: () => void;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  type: "ACCIDENT" | "OUTAGE" | "CONSTRUCTION" | "HAZARD";
  description: string;
  location: Location;
  createdAt: number; // timestamp
  createdBy: string;
  upvotes: number;
  status: "ACTIVE" | "EXPIRED";
  imageUrl?: string;
}

export interface User {
  id: string;
  name: string;
  location: Location;
  notificationRadius: number; // km
  fcmToken?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  incidentId: string;
  timestamp: number;
  read: boolean;
}

export interface FilterOptions {
  types: ("ACCIDENT" | "OUTAGE" | "CONSTRUCTION" | "HAZARD")[];
  radiusKm: number;
  sortBy: "distance" | "recent" | "upvotes";
}
