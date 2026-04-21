import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
} from "react-native";
import { getDistanceKm } from "../utils/geo";
import MapView from "../components/MapView";
import ReportModal from "../components/ReportModal";
import FilterPanel from "../components/FilterPanel";
import NotificationsPanel from "../components/NotificationsPanel";
import { Location, Incident, FilterOptions, Notification } from "../types";
import {
  useLocation,
  useNearbyIncidents,
  useNotifications,
} from "../hooks/useIncidents";
import {
  getNearbyIncidents,
  sortIncidents,
  upvoteIncident,
  getTrendingIncidents,
} from "../services/mockData";
import { useTheme, Theme } from "../theme/ThemeContext";

const HomeScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    location,
    isLoading: locationLoading,
    error: locationError,
  } = useLocation();
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [notificationsPanelVisible, setNotificationsPanelVisible] =
    useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [incidentDetailVisible, setIncidentDetailVisible] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    types: ["ACCIDENT", "OUTAGE", "CONSTRUCTION", "HAZARD"],
    radiusKm: 5,
    sortBy: "distance",
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = getNearbyIncidents(location, filters.radiusKm);
      filtered = filtered.filter((i) => filters.types.includes(i.type));
      filtered = sortIncidents(filtered, filters.sortBy, location);
      setIncidents(filtered);
    }, 300);
    return () => clearTimeout(timer);
  }, [location, filters]);

  const handleReportSubmit = (newIncident: Incident) => {
    setIncidents((prev) => [newIncident, ...prev]);
    Alert.alert(
      "Report Submitted!",
      `Your ${newIncident.type} report has been submitted.\n\nNotifications sent to ${Math.floor(Math.random() * 25) + 5} nearby users!`,
    );
  };

  const handleIncidentPress = (incident: Incident) => {
    setSelectedIncident(incident);
    setIncidentDetailVisible(true);
  };

  const handleUpvote = () => {
    if (selectedIncident) {
      upvoteIncident(selectedIncident.id);
      setSelectedIncident((prev) =>
        prev ? { ...prev, upvotes: prev.upvotes + 1 } : null,
      );
      Alert.alert("", "You confirmed this incident! ✓");
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    const incident = incidents.find((i) => i.id === notification.incidentId);
    if (incident) {
      setSelectedIncident(incident);
      setIncidentDetailVisible(true);
      setNotificationsPanelVisible(false);
    }
  };

  const handleDetailClose = useCallback(() => {
    setIncidentDetailVisible(false);
    setSelectedIncident(null);
  }, []);

  const getTrendingCount = () => {
    return getTrendingIncidents(location, filters.radiusKm).length;
  };

  const s = createThemedStyles(theme);

  return (
    <View style={s.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.surface}
      />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoContainer}>
            <Text style={s.logoIcon}>⚡</Text>
          </View>
          <View>
            <Text style={s.appTitle}>AlertX</Text>
            <Text style={s.appSubtitle}>Live incidents near you</Text>
          </View>
        </View>

        <View style={s.headerRight}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={s.headerBtnIcon}>{isDark ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => setNotificationsPanelVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={s.headerBtnIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => setFilterPanelVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={s.headerBtnIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {locationLoading ? (
        <View style={s.loadingContainer}>
          <View style={s.loadingPulse}>
            <Text style={s.loadingIcon}>📍</Text>
          </View>
          <Text style={s.loadingTitle}>Finding your location...</Text>
          <Text style={s.loadingSub}>
            Please allow location access when prompted
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {locationError && (
            <View style={s.errorBanner}>
              <Text style={s.errorBannerText}>
                ⚠️ Approximate location · {locationError}
              </Text>
            </View>
          )}
          <MapView
            userLocation={location}
            incidents={incidents}
            radiusKm={filters.radiusKm}
            isDark={isDark}
            onIncidentPress={handleIncidentPress}
            onMarkerPress={handleIncidentPress}
          />
        </View>
      )}

      {/* FAB */}
      <View style={s.fabContainer}>
        {getTrendingCount() > 0 && (
          <TouchableOpacity
            style={s.fabTrending}
            activeOpacity={0.85}
            onPress={() => {
              const trending = getTrendingIncidents(location, filters.radiusKm);
              Alert.alert(
                "🔥 Trending",
                `${trending.length} trending incident${trending.length > 1 ? "s" : ""} nearby:\n\n${trending
                  .map(
                    (i) =>
                      `• ${i.type} (${i.upvotes} confirmations)\n  "${i.description}"`,
                  )
                  .join("\n\n")}`,
              );
            }}
          >
            <Text style={s.fabTrendingText}>🔥 {getTrendingCount()}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={s.fabMain}
          activeOpacity={0.85}
          onPress={() => setReportModalVisible(true)}
        >
          <Text style={s.fabMainIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <IncidentDetailModal
        visible={incidentDetailVisible && selectedIncident !== null}
        incident={selectedIncident}
        userLocation={location}
        onClose={handleDetailClose}
        onUpvote={handleUpvote}
        theme={theme}
      />
      <ReportModal
        visible={reportModalVisible}
        userLocation={location}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
      />
      <FilterPanel
        visible={filterPanelVisible}
        currentFilters={filters}
        onFiltersChange={setFilters}
        onClose={() => setFilterPanelVisible(false)}
      />
      <NotificationsPanel
        visible={notificationsPanelVisible}
        notifications={notifications}
        unreadCount={unreadCount}
        onClose={() => setNotificationsPanelVisible(false)}
        onNotificationPress={handleNotificationPress}
        onMarkAsRead={markAsRead}
      />
    </View>
  );
};

/* ── Incident Detail Modal ─────────────── */
interface IncidentDetailModalProps {
  visible: boolean;
  incident: Incident | null;
  userLocation: Location;
  onClose: () => void;
  onUpvote: () => void;
  theme: Theme;
}

const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  visible,
  incident,
  userLocation,
  onClose,
  onUpvote,
  theme,
}) => {
  if (!incident) return null;

  const distance = getDistanceKm(userLocation, incident.location);
  const timeAgo = getTimeAgo(incident.createdAt);
  const t = theme.colors;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: t.overlay,
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: t.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: 28,
            maxHeight: "82%",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: t.border,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: getIncidentColor(incident.type) + "22",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 36 }}>
                  {getIncidentEmoji(incident.type)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: t.text,
                  letterSpacing: 0.5,
                }}
              >
                {incident.type}
              </Text>
              <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
                {timeAgo}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                backgroundColor: t.background,
                borderRadius: 16,
                paddingVertical: 14,
                marginBottom: 20,
              }}
            >
              {[
                { label: "Distance", value: distance.toFixed(1) + " km" },
                { label: "Confirms", value: String(incident.upvotes) },
                {
                  label: "Status",
                  value: incident.status,
                  color: incident.status === "ACTIVE" ? t.success : t.textMuted,
                },
              ].map((m, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: t.textMuted,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: m.color || t.text,
                    }}
                  >
                    {m.value}
                  </Text>
                </View>
              ))}
            </View>

            <Text
              style={{
                fontSize: 15,
                color: t.textSecondary,
                lineHeight: 22,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {incident.description}
            </Text>

            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              {[
                { emoji: "👍", label: "Confirm", action: onUpvote },
                {
                  emoji: "📤",
                  label: "Share",
                  action: () => Alert.alert("", "Share feature coming soon!"),
                },
                {
                  emoji: "🚩",
                  label: "Report",
                  action: () =>
                    Alert.alert("", "Report abuse feature coming soon!"),
                },
              ].map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 14,
                    marginHorizontal: 4,
                    borderRadius: 12,
                    backgroundColor: theme.dark
                      ? t.surfaceElevated
                      : t.primary + "12",
                  }}
                  activeOpacity={0.7}
                  onPress={a.action}
                >
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>
                    {a.emoji}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: t.primary,
                    }}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={{
              backgroundColor: t.primary,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: t.textInverse }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/* ── Helpers ─────────────── */
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

/* ── Themed Styles ─────────────── */
const createThemedStyles = (theme: Theme) => {
  const t = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.separator,
    },
    headerLeft: { flexDirection: "row", alignItems: "center" },
    logoContainer: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: t.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    logoIcon: { fontSize: 20 },
    appTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: t.text,
      letterSpacing: 0.5,
    },
    appSubtitle: { fontSize: 11, color: t.textMuted, marginTop: 1 },
    headerRight: { flexDirection: "row", alignItems: "center" },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.background,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    headerBtnIcon: { fontSize: 18 },
    badge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: t.badgeBg,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: t.surface,
    },
    badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: t.background,
    },
    loadingPulse: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    loadingIcon: { fontSize: 36 },
    loadingTitle: { fontSize: 17, color: t.text, fontWeight: "700" },
    loadingSub: { fontSize: 13, color: t.textMuted, marginTop: 6 },
    errorBanner: {
      backgroundColor: theme.dark ? "#2D1B00" : "#FFF3E0",
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.dark ? "#5C3600" : "#FFE0B2",
    },
    errorBannerText: {
      fontSize: 11,
      color: theme.dark ? "#FECA57" : "#E65100",
      textAlign: "center",
    },
    fabContainer: {
      position: "absolute",
      bottom: 24,
      right: 20,
      alignItems: "center",
    },
    fabTrending: {
      backgroundColor: t.warning,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      marginBottom: 12,
      shadowColor: t.warning,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    fabTrendingText: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
    fabMain: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: t.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: t.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },
    fabMainIcon: {
      fontSize: 30,
      color: "#fff",
      fontWeight: "300",
      marginTop: -2,
    },
  });
};

export default HomeScreen;
