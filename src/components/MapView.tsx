import React, { useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { Location, Incident } from "../types";
import { getDistanceKm } from "../utils/geo";

interface MapViewProps {
  userLocation: Location;
  incidents: Incident[];
  radiusKm?: number;
  onIncidentPress: (incident: Incident) => void;
  onMarkerPress: (incident: Incident) => void;
}

const { height } = Dimensions.get("window");
const MAP_HEIGHT = height * 0.45;

const getIncidentEmoji = (type: Incident["type"]): string => {
  switch (type) {
    case "ACCIDENT":
      return "🚗";
    case "OUTAGE":
      return "⚡";
    case "CONSTRUCTION":
      return "🏗️";
    case "HAZARD":
      return "⚠️";
    default:
      return "📍";
  }
};

const getIncidentColor = (type: Incident["type"]): string => {
  switch (type) {
    case "ACCIDENT":
      return "#FF5252";
    case "OUTAGE":
      return "#FFC107";
    case "CONSTRUCTION":
      return "#FF9800";
    case "HAZARD":
      return "#FF6D00";
    default:
      return "#2196F3";
  }
};

/**
 * Generates the Leaflet HTML for the map using OpenStreetMap tiles (free, no API key)
 */
const generateMapHTML = (
  userLocation: Location,
  incidents: Incident[],
  radiusKm: number,
): string => {
  const markersJS = incidents
    .map((incident) => {
      const emoji = getIncidentEmoji(incident.type);
      const color = getIncidentColor(incident.type);
      const escapedDesc = incident.description
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, " ");
      return `
        (function() {
          var icon = L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:16px;">${emoji}</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          });
          var m = L.marker([${incident.location.lat}, ${incident.location.lng}], {icon: icon}).addTo(map);
          m.bindPopup('<div style="min-width:180px"><b>${emoji} ${incident.type}</b><br/><span style="color:#555;font-size:12px">${escapedDesc}</span><br/><span style="color:#1976D2;font-size:11px;font-weight:600">${getDistanceKm(userLocation, incident.location).toFixed(1)} km away</span> · <span style="font-size:11px">👍 ${incident.upvotes}</span><br/><a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'marker\\',id:\\'${incident.id}\\'}));return false;" style="color:#2196F3;font-size:11px">View details →</a></div>');
        })();`;
    })
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .custom-marker { background: none !important; border: none !important; }
    .user-pulse {
      width: 20px; height: 20px; border-radius: 50%;
      background: rgba(33,150,243,0.4);
      border: 3px solid #2196F3;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(33,150,243,0.4); }
      70% { box-shadow: 0 0 0 15px rgba(33,150,243,0); }
      100% { box-shadow: 0 0 0 0 rgba(33,150,243,0); }
    }
    .leaflet-control-attribution { font-size: 9px !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${userLocation.lat}, ${userLocation.lng}],
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    // OpenStreetMap tiles - completely free, no API key needed
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // User location marker with pulse effect
    var userIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="user-pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    var userMarker = L.marker([${userLocation.lat}, ${userLocation.lng}], {icon: userIcon}).addTo(map);
    userMarker.bindPopup('<b>📍 You are here</b>');

    // Radius circle
    L.circle([${userLocation.lat}, ${userLocation.lng}], {
      radius: ${radiusKm * 1000},
      color: 'rgba(33, 150, 243, 0.3)',
      fillColor: 'rgba(33, 150, 243, 0.07)',
      fillOpacity: 0.7,
      weight: 1.5
    }).addTo(map);

    // Incident markers
    ${markersJS}

    // Listen for recenter command from React Native
    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'recenter') {
          map.flyTo([data.lat, data.lng], 13, { duration: 0.5 });
        }
        if (data.type === 'updateLocation') {
          userMarker.setLatLng([data.lat, data.lng]);
          map.flyTo([data.lat, data.lng], map.getZoom(), { duration: 0.5 });
        }
      } catch(e) {}
    });
    document.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'recenter') {
          map.flyTo([data.lat, data.lng], 13, { duration: 0.5 });
        }
        if (data.type === 'updateLocation') {
          userMarker.setLatLng([data.lat, data.lng]);
          map.flyTo([data.lat, data.lng], map.getZoom(), { duration: 0.5 });
        }
      } catch(e) {}
    });
  </script>
</body>
</html>`;
};

const MapViewComponent: React.FC<MapViewProps> = ({
  userLocation,
  incidents,
  radiusKm = 5,
  onIncidentPress,
  onMarkerPress,
}) => {
  const webViewRef = useRef<WebView>(null);

  const mapHTML = useMemo(
    () => generateMapHTML(userLocation, incidents, radiusKm),
    [userLocation, incidents, radiusKm],
  );

  const handleRecenter = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "recenter",
        lat: userLocation.lat,
        lng: userLocation.lng,
      }),
    );
  };

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "marker") {
        const incident = incidents.find((i) => i.id === data.id);
        if (incident) {
          onIncidentPress(incident);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  return (
    <View style={styles.container}>
      {/* Leaflet Map via WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebViewMessage}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <Text style={styles.mapLoadingText}>🗺️ Loading map...</Text>
            </View>
          )}
        />

        {/* Re-center button */}
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
        >
          <Text style={styles.recenterIcon}>📍</Text>
        </TouchableOpacity>

        {/* Incident count overlay */}
        <View style={styles.incidentCountBadge}>
          <Text style={styles.incidentCountText}>
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""}{" "}
            nearby
          </Text>
        </View>
      </View>

      {/* Incidents list below map */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          Nearby Incidents ({incidents.length})
        </Text>
        <ScrollView style={styles.incidentsList}>
          {incidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No incidents nearby. Stay safe! 🛡️
              </Text>
            </View>
          ) : (
            incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                userLocation={userLocation}
                onPress={() => onIncidentPress(incident)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

interface IncidentCardProps {
  incident: Incident;
  userLocation: Location;
  onPress: () => void;
}

/**
 * Individual incident card
 */
const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  userLocation,
  onPress,
}) => {
  const distance = getDistanceKm(userLocation, incident.location);
  const timeAgo = getTimeAgo(incident.createdAt);

  return (
    <TouchableOpacity style={styles.incidentCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{getIncidentEmoji(incident.type)}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardType}>{incident.type}</Text>
          <Text style={styles.cardTime}>{timeAgo}</Text>
        </View>
        <View style={styles.cardDistance}>
          <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
        </View>
      </View>

      <Text style={styles.cardDescription} numberOfLines={2}>
        {incident.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.upvotes}>
          <Text style={styles.upvoteEmoji}>👍</Text>
          <Text style={styles.upvoteCount}>{incident.upvotes}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                incident.status === "ACTIVE" ? "#4CAF50" : "#999",
            },
          ]}
        >
          <Text style={styles.statusText}>{incident.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  mapContainer: {
    height: MAP_HEIGHT,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  mapLoadingText: {
    fontSize: 16,
    color: "#1976D2",
  },
  recenterButton: {
    position: "absolute",
    bottom: 15,
    left: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recenterIcon: {
    fontSize: 22,
  },
  incidentCountBadge: {
    position: "absolute",
    top: 15,
    left: 15,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  incidentCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  incidentsList: {
    flex: 1,
  },
  incidentCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  cardTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  cardDistance: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1976D2",
  },
  cardDescription: {
    fontSize: 13,
    color: "#555",
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  upvotes: {
    flexDirection: "row",
    alignItems: "center",
  },
  upvoteEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  upvoteCount: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
  },
});

export default MapViewComponent;
