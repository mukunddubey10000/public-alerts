# 🚨 CivicAlerts - Real-Time Civic Alerts App

A React Native mobile app for reporting and discovering location-based civic incidents (accidents, power outages, construction, hazards) in real-time. Perfect for hackathons, this MVP includes a fully mocked backend.

## ✨ Features

### Core Features
- 📍 **Real-time Map View**: Display nearby incidents on a map with distance-based clustering
- 🚨 **Incident Reporting**: Users can report incidents (accidents, outages, construction, hazards) in <3 taps
- 🔔 **Proximity-Based Notifications**: Get alerts when new incidents are reported within your notification radius
- 🔎 **Smart Filtering**: Filter by incident type and search radius
- 👍 **Upvote/Confirm**: Verify incidents with upvotes (confirmation system)
- 🔥 **Trending Incidents**: See what's trending near you based on upvotes
- 📊 **Sort Options**: Sort by distance, recency, or popularity

### User Experience
- 🎨 Clean, modern UI with intuitive navigation
- ⚡ Fast map rendering with mock data
- 🎯 One-tap incident creation
- 💬 Incident detail modal with metrics
- 🔔 Notification panel with unread badge

## 🗂️ Project Structure

```
src/
├── screens/
│   └── HomeScreen.tsx          # Main app screen with map & controls
├── components/
│   ├── MapView.tsx             # Map display with incident markers
│   ├── ReportModal.tsx         # Incident reporting form
│   ├── FilterPanel.tsx         # Filtering & sorting UI
│   └── NotificationsPanel.tsx  # Notifications list
├── hooks/
│   └── useIncidents.ts         # Custom hooks for location & incidents
├── services/
│   └── mockData.ts             # Mock data layer (simulates backend)
├── utils/
│   ├── geo.ts                  # Geolocation utilities (Haversine, bounding box)
├── types/
│   └── index.ts                # TypeScript interfaces
├── navigation/
│   └── RootNavigator.tsx       # Navigation setup
└── App.tsx                     # App entry point
```

## 🛠️ Tech Stack

- **Frontend**: React Native (v0.66.4)
- **Navigation**: @react-navigation/native + @react-navigation/stack
- **Geolocation**: react-native-geolocation-service
- **Maps**: react-native-maps (integrated but using mock)
- **Notifications**: react-native-push-notification
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **Backend**: Mocked (no real backend needed for demo)
- **Database**: In-memory mock data

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- React Native CLI
- Android Studio / Xcode (for emulator)

### Installation

```bash
# 1. Navigate to project
cd my-react-native-app

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Start Metro bundler
npm start

# 4. Run on Android
npm run android

# OR run on iOS
npm run ios
```

## 📱 Usage

### Viewing Incidents
1. Open the app - you'll see nearby incidents on the map
2. Tap on any incident marker or card to view details
3. See distance, confirmation count, and description

### Reporting an Incident
1. Tap the **+** button (bottom right)
2. Select incident type (Accident, Outage, Construction, Hazard)
3. Enter description (optional photo support coming soon)
4. Tap "Submit Report" - nearby users will be notified!

### Filtering & Sorting
1. Tap **⚙️** (filter icon, top right)
2. Select incident types to show
3. Set search radius (2, 5, 10, 20 km)
4. Choose sort order: distance, recent, or upvotes
5. Tap "Apply Filters"

### Notifications
1. Tap **🔔** (bell icon, top right)
2. View all notifications with unread count
3. Tap any notification to jump to that incident

### Confirming Incidents
1. Open an incident detail
2. Tap **👍 Confirm** to upvote
3. Helps other users verify incidents

## 🗃️ Data Model

### Incident
```typescript
{
  id: string;
  type: 'ACCIDENT' | 'OUTAGE' | 'CONSTRUCTION' | 'HAZARD';
  description: string;
  location: { lat, lng };
  createdAt: timestamp;
  createdBy: userId;
  upvotes: number;
  status: 'ACTIVE' | 'EXPIRED';
}
```

### User
```typescript
{
  id: string;
  name: string;
  location: { lat, lng };
  notificationRadius: number; // km
}
```

## 🧮 Key Algorithms

### Haversine Distance
Calculates accurate distance between two lat/lng coordinates using the Haversine formula.
```typescript
getDistanceKm(userLocation, incidentLocation) // returns km
```

### Bounding Box Filtering
Efficiently narrows down incidents before computing exact distances.
```typescript
getBoundingBox(center, radiusKm) // returns {minLat, maxLat, minLng, maxLng}
```

### Radius-Based Notifications
When an incident is reported, the system finds all users within the notification radius and sends them push notifications.

## 🎮 Demo Data

The app comes pre-loaded with 6 mock incidents across Bangalore:
- **Accident** on MG Road (15 min ago, 12 upvotes)
- **Power Outage** in Koramangala (30 min ago, 8 upvotes)
- **Road Construction** on Sarjapur (2 hours ago, 5 upvotes)
- **Hazard** on Whitefield Road (45 min ago, 18 upvotes)
- **Accident** near Indiranagar (5 min ago, 3 upvotes)
- **Water Outage** in Marathahalli (1 hour ago, 6 upvotes)

**Default location**: Bangalore Vidhana Soudha (12.9716, 77.5946)

## 🔄 Mock Backend Simulation

The `mockData.ts` service simulates all backend functions:
- ✅ Get nearby incidents (geo-query)
- ✅ Create incident (auto-triggers notifications)
- ✅ Upvote incident
- ✅ Get notifications for current user
- ✅ Mark notification as read
- ✅ Get trending incidents

**Real implementation** would replace this with actual API calls (Firebase, Express, etc.)

## 🚀 Production Roadmap

To convert this to production:

1. **Backend**: Deploy Node.js/Express API or Firebase Functions
2. **Database**: Use Firebase Firestore or MongoDB with geo indexes
3. **Maps**: Integrate real Google Maps / Mapbox SDK
4. **Notifications**: Configure Firebase Cloud Messaging (FCM)
5. **Auth**: Add Firebase Auth (Google, OTP)
6. **Media**: Implement image upload for incident reports
7. **Moderation**: Add admin panel for report verification
8. **Analytics**: Track incidents, users, engagement

## 🎨 UI Components

### MapView
- Displays incident markers with custom colors per type
- Shows incident cards below map with distance, time, upvotes
- Tap markers to open detail view

### ReportModal
- 4 incident type selector
- Multi-line description input (500 char limit)
- Auto-captured location display
- Submit feedback

### FilterPanel
- Checkbox filters for incident types
- Radio buttons for radius selection (2, 5, 10, 20 km)
- Sort option selector
- Real-time preview of filter count

### NotificationsPanel
- Full-screen notification list
- Unread badge indicator
- Tap to jump to incident
- Auto-mark as read

## 🧪 Testing

```bash
# Run tests
npm test

# Lint code
npm run lint
```

## 📸 Screenshots

(When run on emulator/device)
- Map view with incident markers
- Report modal with type selector
- Filter panel with options
- Notifications panel
- Incident detail modal

## 🤝 Contributing

For hackathon improvements:
1. Add heatmap visualization
2. Implement verified user badges
3. Add AI incident summary
4. Include weather integration
5. Add police/emergency dispatch integration

## 📄 License

MIT

## 👨‍💻 Author

Built for hackathon - Location-based Civic Alerts MVP

---

**Ready to demo!** This app showcases:
- ✅ Clean React Native architecture
- ✅ Geolocation algorithms (Haversine)
- ✅ Real-time incident system
- ✅ Intuitive UX with modals & filters
- ✅ Production-ready code structure
