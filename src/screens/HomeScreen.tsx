import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	TouchableOpacity,
	Text,
	Alert,
	Dimensions,
} from "react-native";
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

const HomeScreen = () => {
	const { location, isLoading: locationLoading, error: locationError } = useLocation();
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

	// Fetch incidents based on filters
	const [incidents, setIncidents] = useState<Incident[]>([]);

	useEffect(() => {
		// Simulate fetching incidents
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

	const getTrendingCount = () => {
		return getTrendingIncidents(location, filters.radiusKm).length;
	};

	return (
		<View style={styles.container}>
			{/* Top Control Bar */}
			<View style={styles.topBar}>
				<View style={styles.titleSection}>
					<Text style={styles.appTitle}>🚨 CivicAlerts</Text>
					<Text style={styles.appSubtitle}>Real-time incidents near you</Text>
				</View>

				<View style={styles.topRightButtons}>
					{/* Notifications Button */}
					<TouchableOpacity
						style={styles.notificationButton}
						onPress={() => setNotificationsPanelVisible(true)}
					>
						<Text style={styles.notificationIcon}>🔔</Text>
						{unreadCount > 0 && (
							<View style={styles.notificationBadge}>
								<Text style={styles.notificationBadgeText}>
									{unreadCount > 9 ? "9+" : unreadCount}
								</Text>
							</View>
						)}
					</TouchableOpacity>

					{/* Filter Button */}
					<TouchableOpacity
						style={styles.filterButton}
						onPress={() => setFilterPanelVisible(true)}
					>
						<Text style={styles.filterIcon}>⚙️</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Main Map View */}
			{locationLoading ? (
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingEmoji}>📍</Text>
					<Text style={styles.loadingText}>Fetching your location...</Text>
					<Text style={styles.loadingSubtext}>
						Please allow location access when prompted
					</Text>
				</View>
			) : (
				<View style={{ flex: 1 }}>
					{locationError && (
						<View style={styles.locationErrorBanner}>
							<Text style={styles.locationErrorText}>
								⚠️ Using approximate location: {locationError}
							</Text>
						</View>
					)}
					<MapView
						userLocation={location}
						incidents={incidents}
						radiusKm={filters.radiusKm}
						onIncidentPress={handleIncidentPress}
						onMarkerPress={handleIncidentPress}
					/>
				</View>
			)}

			{/* Floating Action Buttons */}
			<View style={styles.fab}>
				{/* Report Button */}
				<TouchableOpacity
					style={[styles.fabButton, styles.reportButton]}
					onPress={() => setReportModalVisible(true)}
				>
					<Text style={styles.fabButtonText}>+</Text>
				</TouchableOpacity>

				{/* Trending Button */}
				{getTrendingCount() > 0 && (
					<TouchableOpacity
						style={[styles.fabButton, styles.trendingButton]}
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
						<Text style={styles.trendingBadgeText}>
							🔥 {getTrendingCount()}
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Incident Detail Modal */}
			{selectedIncident && (
				<IncidentDetailModal
					visible={incidentDetailVisible}
					incident={selectedIncident}
					userLocation={location}
					onClose={() => setIncidentDetailVisible(false)}
					onUpvote={handleUpvote}
				/>
			)}

			{/* Report Modal */}
			<ReportModal
				visible={reportModalVisible}
				userLocation={location}
				onClose={() => setReportModalVisible(false)}
				onSubmit={handleReportSubmit}
			/>

			{/* Filter Panel */}
			<FilterPanel
				visible={filterPanelVisible}
				currentFilters={filters}
				onFiltersChange={setFilters}
				onClose={() => setFilterPanelVisible(false)}
			/>

			{/* Notifications Panel */}
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

/**
 * Incident Detail Modal
 */
interface IncidentDetailModalProps {
	visible: boolean;
	incident: Incident;
	userLocation: Location;
	onClose: () => void;
	onUpvote: () => void;
}

const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
	visible,
	incident,
	userLocation,
	onClose,
	onUpvote,
}) => {
	const { getDistanceKm } = require("../utils/geo");
	const distance = getDistanceKm(userLocation, incident.location);
	const timeAgo = getTimeAgo(incident.createdAt);

	return (
		<View style={styles.detailOverlay}>
			{visible && (
				<View style={styles.detailModal}>
					<TouchableOpacity style={styles.detailClose} onPress={onClose}>
						<Text style={styles.detailCloseText}>✕</Text>
					</TouchableOpacity>

					<View style={styles.detailContent}>
						<Text style={styles.detailEmoji}>
							{getIncidentEmoji(incident.type)}
						</Text>

						<Text style={styles.detailType}>{incident.type}</Text>
						<Text style={styles.detailTime}>{timeAgo}</Text>

						<View style={styles.detailMetrics}>
							<View style={styles.metric}>
								<Text style={styles.metricLabel}>Distance</Text>
								<Text style={styles.metricValue}>{distance.toFixed(1)} km</Text>
							</View>
							<View style={styles.metric}>
								<Text style={styles.metricLabel}>Confirmations</Text>
								<Text style={styles.metricValue}>{incident.upvotes}</Text>
							</View>
							<View style={styles.metric}>
								<Text style={styles.metricLabel}>Status</Text>
								<Text
									style={[
										styles.metricValue,
										{
											color: incident.status === "ACTIVE" ? "#4CAF50" : "#999",
										},
									]}
								>
									{incident.status}
								</Text>
							</View>
						</View>

						<Text style={styles.detailDescription}>{incident.description}</Text>

						<View style={styles.detailActions}>
							<TouchableOpacity
								style={styles.detailActionButton}
								onPress={onUpvote}
							>
								<Text style={styles.detailActionEmoji}>👍</Text>
								<Text style={styles.detailActionText}>Confirm</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.detailActionButton}
								onPress={() => Alert.alert("", "Share feature coming soon!")}
							>
								<Text style={styles.detailActionEmoji}>📤</Text>
								<Text style={styles.detailActionText}>Share</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.detailActionButton}
								onPress={() =>
									Alert.alert("", "Report abuse feature coming soon!")
								}
							>
								<Text style={styles.detailActionEmoji}>🚩</Text>
								<Text style={styles.detailActionText}>Report</Text>
							</TouchableOpacity>
						</View>
					</View>

					<TouchableOpacity
						style={styles.detailCloseButtonBottom}
						onPress={onClose}
					>
						<Text style={styles.detailCloseButtonText}>Close</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

// Helper functions
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
	topBar: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 15,
		paddingVertical: 12,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
		paddingTop: 12,
	},
	titleSection: {
		flex: 1,
	},
	appTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#FF5252",
	},
	appSubtitle: {
		fontSize: 11,
		color: "#999",
		marginTop: 2,
	},
	topRightButtons: {
		flexDirection: "row",
		gap: 10,
	},
	notificationButton: {
		position: "relative",
		paddingHorizontal: 8,
		paddingVertical: 5,
	},
	notificationIcon: {
		fontSize: 24,
	},
	notificationBadge: {
		position: "absolute",
		top: -5,
		right: -5,
		backgroundColor: "#FF5252",
		width: 22,
		height: 22,
		borderRadius: 11,
		justifyContent: "center",
		alignItems: "center",
	},
	notificationBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "bold",
	},
	filterButton: {
		paddingHorizontal: 8,
		paddingVertical: 5,
	},
	filterIcon: {
		fontSize: 22,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
	},
	loadingEmoji: {
		fontSize: 40,
		marginBottom: 12,
	},
	loadingText: {
		fontSize: 16,
		color: "#333",
		fontWeight: "600",
	},
	loadingSubtext: {
		fontSize: 12,
		color: "#999",
		marginTop: 6,
	},
	locationErrorBanner: {
		backgroundColor: "#FFF3E0",
		paddingVertical: 6,
		paddingHorizontal: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#FFE0B2",
	},
	locationErrorText: {
		fontSize: 11,
		color: "#E65100",
		textAlign: "center",
	},
	fab: {
		position: "absolute",
		bottom: 20,
		right: 20,
		gap: 10,
	},
	fabButton: {
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	reportButton: {
		backgroundColor: "#2196F3",
	},
	fabButtonText: {
		fontSize: 32,
		color: "#fff",
		fontWeight: "bold",
	},
	trendingButton: {
		backgroundColor: "#FF9800",
		paddingHorizontal: 8,
		width: "auto",
		paddingVertical: 8,
	},
	trendingBadgeText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#fff",
	},
	detailOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
		zIndex: 1000,
	},
	detailModal: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: 20,
		paddingVertical: 20,
		maxHeight: "80%",
	},
	detailClose: {
		alignItems: "flex-end",
		marginBottom: 15,
	},
	detailCloseText: {
		fontSize: 28,
		color: "#999",
	},
	detailContent: {
		alignItems: "center",
	},
	detailEmoji: {
		fontSize: 48,
		marginBottom: 10,
	},
	detailType: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 5,
	},
	detailTime: {
		fontSize: 12,
		color: "#999",
		marginBottom: 15,
	},
	detailMetrics: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		backgroundColor: "#f5f5f5",
		paddingVertical: 12,
		borderRadius: 10,
		marginBottom: 15,
	},
	metric: {
		alignItems: "center",
	},
	metricLabel: {
		fontSize: 11,
		color: "#999",
		marginBottom: 4,
	},
	metricValue: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
	},
	detailDescription: {
		fontSize: 14,
		color: "#555",
		marginBottom: 15,
		lineHeight: 20,
		textAlign: "center",
	},
	detailActions: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		marginBottom: 15,
	},
	detailActionButton: {
		alignItems: "center",
		flex: 1,
		paddingVertical: 10,
		marginHorizontal: 5,
		borderRadius: 8,
		backgroundColor: "#E3F2FD",
	},
	detailActionEmoji: {
		fontSize: 24,
		marginBottom: 3,
	},
	detailActionText: {
		fontSize: 12,
		color: "#1565C0",
		fontWeight: "600",
	},
	detailCloseButtonBottom: {
		backgroundColor: "#2196F3",
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	detailCloseButtonText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#fff",
	},
});

export default HomeScreen;
