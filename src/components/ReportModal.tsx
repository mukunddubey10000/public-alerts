import React, { useState } from "react";
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	Alert,
} from "react-native";
import { Incident, Location } from "../types";
import { createIncident } from "../services/mockData";

interface ReportModalProps {
	visible: boolean;
	userLocation: Location;
	onClose: () => void;
	onSubmit: (incident: Incident) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
	visible,
	userLocation,
	onClose,
	onSubmit,
}) => {
	const [selectedType, setSelectedType] = useState<Incident["type"] | null>(
		null,
	);
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const incidentTypes: Incident["type"][] = [
		"ACCIDENT",
		"OUTAGE",
		"CONSTRUCTION",
		"HAZARD",
	];

	const handleSubmit = () => {
		if (!selectedType || !description.trim()) {
			Alert.alert("Error", "Please select a type and enter a description");
			return;
		}

		setIsSubmitting(true);
		// Simulate API call
		setTimeout(() => {
			const newIncident = createIncident(
				selectedType,
				description.trim(),
				userLocation,
			);
			onSubmit(newIncident);
			resetForm();
			setIsSubmitting(false);
			onClose();
		}, 500);
	};

	const resetForm = () => {
		setSelectedType(null);
		setDescription("");
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={handleClose}
		>
			<View style={styles.container}>
				<View style={styles.modal}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.title}>Report an Incident</Text>
						<TouchableOpacity onPress={handleClose}>
							<Text style={styles.closeButton}>✕</Text>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content}>
						{/* Type Selection */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Type of Incident</Text>
							<View style={styles.typeGrid}>
								{incidentTypes.map((type) => (
									<TouchableOpacity
										key={type}
										style={[
											styles.typeButton,
											selectedType === type && styles.typeButtonSelected,
										]}
										onPress={() => setSelectedType(type)}
									>
										<Text style={styles.typeEmoji}>
											{getIncidentEmoji(type)}
										</Text>
										<Text style={styles.typeLabel}>{type}</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Description */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Description</Text>
							<TextInput
								style={styles.input}
								placeholder="Describe what happened..."
								placeholderTextColor="#999"
								multiline
								numberOfLines={5}
								value={description}
								onChangeText={setDescription}
								maxLength={500}
							/>
							<Text style={styles.charCount}>{description.length}/500</Text>
						</View>

						{/* Location Info */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Location</Text>
							<View style={styles.locationBox}>
								<Text style={styles.locationEmoji}>📍</Text>
								<View>
									<Text style={styles.locationText}>
										Lat: {userLocation.lat.toFixed(4)}
									</Text>
									<Text style={styles.locationText}>
										Lng: {userLocation.lng.toFixed(4)}
									</Text>
								</View>
							</View>
							<Text style={styles.hint}>
								Location is captured automatically from your device
							</Text>
						</View>
					</ScrollView>

					{/* Footer with Buttons */}
					<View style={styles.footer}>
						<TouchableOpacity
							style={[styles.button, styles.cancelButton]}
							onPress={handleClose}
							disabled={isSubmitting}
						>
							<Text style={styles.cancelButtonText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.button,
								styles.submitButton,
								(!selectedType || !description.trim() || isSubmitting) &&
									styles.submitButtonDisabled,
							]}
							onPress={handleSubmit}
							disabled={!selectedType || !description.trim() || isSubmitting}
						>
							<Text style={styles.submitButtonText}>
								{isSubmitting ? "Submitting..." : "Submit Report"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

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

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	modal: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: "90%",
		paddingBottom: 20,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
	},
	closeButton: {
		fontSize: 24,
		color: "#999",
	},
	content: {
		paddingHorizontal: 20,
		paddingVertical: 15,
	},
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 10,
	},
	typeGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	typeButton: {
		width: "48%",
		paddingVertical: 15,
		paddingHorizontal: 10,
		borderRadius: 10,
		backgroundColor: "#f5f5f5",
		alignItems: "center",
		marginBottom: 10,
		borderWidth: 2,
		borderColor: "transparent",
	},
	typeButtonSelected: {
		backgroundColor: "#E3F2FD",
		borderColor: "#2196F3",
	},
	typeEmoji: {
		fontSize: 32,
		marginBottom: 5,
	},
	typeLabel: {
		fontSize: 12,
		fontWeight: "bold",
		color: "#333",
		textAlign: "center",
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		padding: 12,
		fontSize: 14,
		color: "#333",
		textAlignVertical: "top",
		maxHeight: 150,
	},
	charCount: {
		fontSize: 12,
		color: "#999",
		marginTop: 5,
		textAlign: "right",
	},
	locationBox: {
		flexDirection: "row",
		backgroundColor: "#f5f5f5",
		padding: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	locationEmoji: {
		fontSize: 24,
		marginRight: 10,
	},
	locationText: {
		fontSize: 12,
		color: "#555",
		marginVertical: 2,
	},
	hint: {
		fontSize: 12,
		color: "#999",
		marginTop: 8,
		fontStyle: "italic",
	},
	footer: {
		flexDirection: "row",
		paddingHorizontal: 20,
		paddingTop: 15,
		gap: 10,
	},
	button: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	cancelButton: {
		backgroundColor: "#f5f5f5",
	},
	cancelButtonText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#666",
	},
	submitButton: {
		backgroundColor: "#2196F3",
	},
	submitButtonDisabled: {
		backgroundColor: "#ccc",
	},
	submitButtonText: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#fff",
	},
});

export default ReportModal;
