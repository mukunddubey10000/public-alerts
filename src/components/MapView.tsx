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
import { useTheme, Theme } from "../theme/ThemeContext";

interface MapViewProps {
  userLocation: Location;
  incidents: Incident[];
  radiusKm?: number;
  isDark?: boolean;
  onIncidentPress: (incident: Incident) => void;
  onMarkerPress: (incident: Incident) => void;
}

const { height } = Dimensions.get("window");
const MAP_HEIGHT = height * 0.42;

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
      return "#FF6B6B";
    case "OUTAGE":
      return "#FECA57";
    case "CONSTRUCTION":
      return "#FF9F43";
    case "HAZARD":
      return "#EE5A24";
    default:
      return "#6C5CE7";
  }
};

const generateMapHTML = (
  userLocation: Location,
  incidents: Incident[],
  radiusKm: number,
  isDark: boolean,
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
            html: '<div style="background:${color};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid ${isDark ? "#1C2333" : "#fff"};box-shadow:0 3px 8px rgba(0,0,0,0.35);font-size:17px;">${emoji}</div>',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17]
          });
          var m = L.marker([${incident.location.lat}, ${incident.location.lng}], {icon: icon}).addTo(map);
          m.bindPopup('<div style="min-width:190px;font-family:system-ui,sans-serif;"><b style="font-size:13px;">${emoji} ${incident.type}</b><br/><span style="color:${isDark ? "#8B949E" : "#555"};font-size:12px;line-height:1.4;">${escapedDesc}</span><br/><span style="color:#6C5CE7;font-size:11px;font-weight:600;">${getDistanceKm(userLocation, incident.location).toFixed(1)} km</span> · <span style="font-size:11px;">👍 ${incident.upvotes}</span><br/><a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'marker\\',id:\\'${incident.id}\\'}));return false;" style="color:#A29BFE;font-size:11px;font-weight:600;">View details →</a></div>');
        })();`;
    })
    .join("\n");

  // Dark tile: CartoDB Dark Matter. Light tile: CartoDB Voyager (beautiful & free)
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const popupStyle = isDark
    ? ".leaflet-popup-content-wrapper{background:#1C2333;color:#E6EDF3;border:1px solid #30363D;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.5);} .leaflet-popup-tip{background:#1C2333;}"
    : ".leaflet-popup-content-wrapper{background:#fff;color:#1A1A2E;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);} .leaflet-popup-tip{background:#fff;}";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100vh; background: ${isDark ? "#0D1117" : "#F0F2F5"}; }
    .custom-marker { background: none !important; border: none !important; }
    .user-dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: #6C5CE7;
      border: 3px solid ${isDark ? "#1C2333" : "#fff"};
      box-shadow: 0 0 0 6px rgba(108,92,231,0.25);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(108,92,231,0.35); }
      70% { box-shadow: 0 0 0 14px rgba(108,92,231,0); }
      100% { box-shadow: 0 0 0 0 rgba(108,92,231,0); }
    }
    ${popupStyle}
    .leaflet-popup-content { margin: 10px 12px; line-height: 1.5; }
    .leaflet-control-attribution { font-size: 8px !important; opacity: 0.6; }
    .leaflet-control-zoom a { background: ${isDark ? "#1C2333" : "#fff"} !important; color: ${isDark ? "#E6EDF3" : "#333"} !important; border-color: ${isDark ? "#30363D" : "#ddd"} !important; }
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

    L.tileLayer('${tileUrl}', {
      maxZoom: 19,
      attribution: '© OpenStreetMap © CARTO'
    }).addTo(map);

    var userIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="user-dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    var userMarker = L.marker([${userLocation.lat}, ${userLocation.lng}], {icon: userIcon}).addTo(map);
    userMarker.bindPopup('<b>📍 You are here</b>');

    L.circle([${userLocation.lat}, ${userLocation.lng}], {
      radius: ${radiusKm * 1000},
      color: 'rgba(108, 92, 231, 0.25)',
      fillColor: 'rgba(108, 92, 231, 0.06)',
      fillOpacity: 1,
      weight: 1.5,
      dashArray: '6 4'
    }).addTo(map);

    ${markersJS}

    function handleMsg(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'recenter') map.flyTo([data.lat, data.lng], 13, { duration: 0.5 });
        if (data.type === 'updateLocation') { userMarker.setLatLng([data.lat, data.lng]); map.flyTo([data.lat, data.lng], map.getZoom(), { duration: 0.5 }); }
      } catch(e) {}
    }
    window.addEventListener('message', handleMsg);
    document.addEventListener('message', handleMsg);
  </script>
</body>
</html>`;
};

const MapViewComponent: React.FC<MapViewProps> = ({
  userLocation,
  incidents,
  radiusKm = 5,
  isDark = false,
  onIncidentPress,
  onMarkerPress,
}) => {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const s = createThemedStyles(theme);

  const mapHTML = useMemo(
    () => generateMapHTML(userLocation, incidents, radiusKm, isDark),
    [userLocation, incidents, radiusKm, isDark],
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
        if (incident) onIncidentPress(incident);
      }
    } catch (e) {}
  };

  return (
    <View style={s.container}>
      <View style={s.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={s.map}
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
            <View style={s.mapLoading}>
              <Text style={s.mapLoadingText}>🗺️ Loading map...</Text>
            </View>
          )}
        />

        <TouchableOpacity
          style={s.recenterBtn}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Text style={s.recenterIcon}>📍</Text>
        </TouchableOpacity>

        <View style={s.countBadge}>
          <Text style={s.countText}>
            {incidents.length} incident{incidents.length !== 1 ? "s" : ""}{" "}
            nearby
          </Text>
        </View>
      </View>

      {/* Incident List */}
      <View style={s.listContainer}>
        <Text style={s.listTitle}>Nearby Incidents ({incidents.length})</Text>
        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          {incidents.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🛡️</Text>
              <Text style={s.emptyText}>No incidents nearby</Text>
              <Text style={s.emptySub}>Stay safe out there!</Text>
            </View>
          ) : (
            incidents.map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={s.card}
                onPress={() => onIncidentPress(incident)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    s.cardAccent,
                    { backgroundColor: getIncidentColor(incident.type) },
                  ]}
                />
                <View style={s.cardBody}>
                  <View style={s.cardRow}>
                    <View
                      style={[
                        s.cardEmojiWrap,
                        {
                          backgroundColor:
                            getIncidentColor(incident.type) + "18",
                        },
                      ]}
                    >
                      <Text style={s.cardEmoji}>
                        {getIncidentEmoji(incident.type)}
                      </Text>
                    </View>
                    <View style={s.cardInfo}>
                      <Text style={s.cardType}>{incident.type}</Text>
                      <Text style={s.cardTime}>
                        {getTimeAgo(incident.createdAt)}
                      </Text>
                    </View>
                    <View style={s.cardDistBadge}>
                      <Text style={s.cardDist}>
                        {getDistanceKm(userLocation, incident.location).toFixed(
                          1,
                        )}{" "}
                        km
                      </Text>
                    </View>
                  </View>
                  <Text style={s.cardDesc} numberOfLines={2}>
                    {incident.description}
                  </Text>
                  <View style={s.cardFooter}>
                    <View style={s.upvoteWrap}>
                      <Text style={s.upvoteIcon}>👍</Text>
                      <Text style={s.upvoteCount}>{incident.upvotes}</Text>
                    </View>
                    <View
                      style={[
                        s.statusPill,
                        {
                          backgroundColor:
                            incident.status === "ACTIVE"
                              ? theme.colors.success + "22"
                              : theme.colors.textMuted + "22",
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.statusDot,
                          {
                            backgroundColor:
                              incident.status === "ACTIVE"
                                ? theme.colors.success
                                : theme.colors.textMuted,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          s.statusText,
                          {
                            color:
                              incident.status === "ACTIVE"
                                ? theme.colors.success
                                : theme.colors.textMuted,
                          },
                        ]}
                      >
                        {incident.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const getTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const createThemedStyles = (theme: Theme) => {
  const t = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    mapContainer: { height: MAP_HEIGHT, position: "relative" },
    map: { flex: 1 },
    mapLoading: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    mapLoadingText: { fontSize: 16, color: t.textSecondary },
    recenterBtn: {
      position: "absolute",
      bottom: 14,
      left: 14,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: t.surface,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
      borderWidth: 1,
      borderColor: t.border,
    },
    recenterIcon: { fontSize: 20 },
    countBadge: {
      position: "absolute",
      top: 14,
      left: 14,
      backgroundColor: theme.dark ? "rgba(22,27,34,0.85)" : "rgba(0,0,0,0.65)",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    countText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    listTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: t.text,
      marginBottom: 12,
    },
    list: { flex: 1 },
    emptyState: { paddingVertical: 40, alignItems: "center" },
    emptyIcon: { fontSize: 40, marginBottom: 10 },
    emptyText: { fontSize: 16, fontWeight: "600", color: t.text },
    emptySub: { fontSize: 13, color: t.textMuted, marginTop: 4 },
    card: {
      flexDirection: "row",
      backgroundColor: t.cardBg,
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      shadowColor: t.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.dark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: theme.dark ? 1 : 0,
      borderColor: t.border,
    },
    cardAccent: { width: 4 },
    cardBody: { flex: 1, padding: 14 },
    cardRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    cardEmojiWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    cardEmoji: { fontSize: 20 },
    cardInfo: { flex: 1 },
    cardType: { fontSize: 14, fontWeight: "700", color: t.text },
    cardTime: { fontSize: 11, color: t.textMuted, marginTop: 2 },
    cardDistBadge: {
      backgroundColor: t.primary + "18",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    cardDist: { fontSize: 12, fontWeight: "700", color: t.primary },
    cardDesc: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    upvoteWrap: { flexDirection: "row", alignItems: "center" },
    upvoteIcon: { fontSize: 14, marginRight: 4 },
    upvoteCount: { fontSize: 12, color: t.textSecondary, fontWeight: "600" },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
  });
};

export default MapViewComponent;
