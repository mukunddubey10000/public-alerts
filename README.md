# CivicAlerts

A React Native app for real-time community incident reporting and notifications. Users can report accidents, outages, construction, and hazards near them, and receive alerts about nearby incidents.

## Getting Started

### Prerequisites

- Node.js (v14+)
- React Native CLI
- Android Studio (for Android) or Xcode (for iOS)

### Installation

```bash
git clone <repository-url>
cd public-alerts
npm install
```

### Running

```bash
npm start          # Start Metro bundler
npm run android    # Run on Android
npm run ios        # Run on iOS
```

## Project Structure

```
src/
  App.tsx                        # App entry point
  screens/HomeScreen.tsx         # Main screen with map, filters, reports
  components/
    Button.tsx                   # Reusable button
    FilterPanel.tsx              # Incident type/radius filters
    MapView.tsx                  # Map display (mocked)
    NotificationsPanel.tsx       # Notification list
    ReportModal.tsx              # New incident report form
  hooks/useIncidents.ts          # Incident data hooks
  services/mockData.ts           # Mock backend with CRUD & notifications
  navigation/RootNavigator.tsx   # Tab navigation setup
  types/index.ts                 # TypeScript interfaces
  utils/geo.ts                   # Geolocation utilities (Haversine, bounding box)
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details.
