import React from "react";
import {
	View,
	Text,
	StyleSheet,
	Dimensions,
	TouchableOpacity,
	ScrollView,
	Image,
} from "react-native";
import { Location, Incident } from "../types";
import { getDistanceKm } from "../utils/geo";

interface MapViewProps {
	userLocation: Location;
	incidents: Incident[];
	onIncidentPress: (incident: Incident) => void;
	onMarkerPress: (incident: Incident) => void;
}

/**
 * Simplified map view (mock)
 * In production, use react-native-maps with MapView component
 */
const MapView: React.FC<MapViewProps> = ({
	userLocation,
	incidents,
	onIncidentPress,
	onMarkerPress,
}) => {
	return (
		<View style={styles.container}>
			{/* Map placeholder */}
			<View style={styles.mapPlaceholder}>
				<Text style={styles.mapPlaceholderText}>
					📍 Map View (Bangalore, India)
				</Text>
				<Text style={styles.coordsText}>
					{`Your Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
				</Text>

				{/* Incident markers (simplified list below map) */}
				<ScrollView style={styles.markersContainer} horizontal>
					{incidents.map((incident) => (
						<TouchableOpacity
							key={incident.id}
							style={[
								styles.marker,
								{
									backgroundColor: getIncidentColor(incident.type),
								},
							]}
							onPress={() => onMarkerPress(incident)}
						>
							<Text style={styles.markerText}>
								{getIncidentEmoji(incident.type)}
							</Text>
							<Text style={styles.markerDistance}>
								{getDistanceKm(userLocation, incident.location).toFixed(1)} km
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
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

// Helpers
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
	mapPlaceholder: {
		height: "40%",
		backgroundColor: "#E3F2FD",
		padding: 15,
		justifyContent: "center",
		alignItems: "center",
		borderBottomWidth: 2,
		borderBottomColor: "#2196F3",
	},
	mapPlaceholderText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#1976D2",
		marginBottom: 10,
	},
	coordsText: {
		fontSize: 12,
		color: "#555",
		marginBottom: 15,
	},
	markersContainer: {
		maxHeight: 80,
		marginVertical: 10,
	},
	marker: {
		width: 70,
		height: 70,
		borderRadius: 35,
		justifyContent: "center",
		alignItems: "center",
		marginHorizontal: 5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	markerText: {
		fontSize: 28,
	},
	markerDistance: {
		fontSize: 10,
		color: "#fff",
		fontWeight: "bold",
		marginTop: 3,
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

export default MapView;
