import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ScrollView,
	Dimensions,
} from "react-native";
import { FilterOptions, Incident } from "../types";

interface FilterPanelProps {
	visible: boolean;
	currentFilters: FilterOptions;
	onFiltersChange: (filters: FilterOptions) => void;
	onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
	visible,
	currentFilters,
	onFiltersChange,
	onClose,
}) => {
	const [filters, setFilters] = useState<FilterOptions>(currentFilters);

	const incidentTypes: Incident["type"][] = [
		"ACCIDENT",
		"OUTAGE",
		"CONSTRUCTION",
		"HAZARD",
	];
	const radiusOptions = [2, 5, 10, 20];
	const sortOptions: Array<"distance" | "recent" | "upvotes"> = [
		"distance",
		"recent",
		"upvotes",
	];

	const toggleType = (type: Incident["type"]) => {
		setFilters((prev) => ({
			...prev,
			types: prev.types.includes(type)
				? prev.types.filter((t) => t !== type)
				: [...prev.types, type],
		}));
	};

	const handleApply = () => {
		onFiltersChange(filters);
		onClose();
	};

	const handleReset = () => {
		const defaultFilters: FilterOptions = {
			types: ["ACCIDENT", "OUTAGE", "CONSTRUCTION", "HAZARD"],
			radiusKm: 5,
			sortBy: "distance",
		};
		setFilters(defaultFilters);
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent={true}
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.panel}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.title}>Filter Incidents</Text>
						<TouchableOpacity onPress={onClose}>
							<Text style={styles.closeButton}>✕</Text>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content}>
						{/* Incident Type Filter */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Incident Type</Text>
							<View style={styles.typeCheckboxes}>
								{incidentTypes.map((type) => (
									<TouchableOpacity
										key={type}
										style={styles.checkboxRow}
										onPress={() => toggleType(type)}
									>
										<View
											style={[
												styles.checkbox,
												filters.types.includes(type) && styles.checkboxChecked,
											]}
										>
											{filters.types.includes(type) && (
												<Text style={styles.checkmark}>✓</Text>
											)}
										</View>
										<Text style={styles.checkboxLabel}>{type}</Text>
										<Text style={styles.typeEmoji}>
											{getIncidentEmoji(type)}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Radius Filter */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Search Radius</Text>
							<View style={styles.radiusOptions}>
								{radiusOptions.map((radius) => (
									<TouchableOpacity
										key={radius}
										style={[
											styles.radiusButton,
											filters.radiusKm === radius &&
												styles.radiusButtonSelected,
										]}
										onPress={() =>
											setFilters((prev) => ({ ...prev, radiusKm: radius }))
										}
									>
										<Text
											style={[
												styles.radiusButtonText,
												filters.radiusKm === radius &&
													styles.radiusButtonTextSelected,
											]}
										>
											{radius} km
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Sort Options */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Sort By</Text>
							<View style={styles.sortOptions}>
								{sortOptions.map((option) => (
									<TouchableOpacity
										key={option}
										style={styles.sortRow}
										onPress={() =>
											setFilters((prev) => ({ ...prev, sortBy: option }))
										}
									>
										<View
											style={[
												styles.radio,
												filters.sortBy === option && styles.radioSelected,
											]}
										>
											{filters.sortBy === option && (
												<View style={styles.radioDot} />
											)}
										</View>
										<Text style={styles.sortLabel}>
											{option.charAt(0).toUpperCase() + option.slice(1)}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Info */}
						<View style={styles.info}>
							<Text style={styles.infoText}>
								Currently showing {filters.types.length} incident type(s) within{" "}
								{filters.radiusKm} km, sorted by {filters.sortBy}
							</Text>
						</View>
					</ScrollView>

					{/* Footer */}
					<View style={styles.footer}>
						<TouchableOpacity
							style={[styles.button, styles.resetButton]}
							onPress={handleReset}
						>
							<Text style={styles.resetButtonText}>Reset</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, styles.applyButton]}
							onPress={handleApply}
						>
							<Text style={styles.applyButtonText}>Apply Filters</Text>
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
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
	},
	panel: {
		width: "85%",
		maxHeight: "80%",
		backgroundColor: "#fff",
		borderRadius: 15,
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
		backgroundColor: "#f9f9f9",
	},
	title: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
	},
	closeButton: {
		fontSize: 22,
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
		fontSize: 13,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 10,
		textTransform: "uppercase",
	},
	typeCheckboxes: {
		gap: 10,
	},
	checkboxRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: "#ddd",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10,
	},
	checkboxChecked: {
		backgroundColor: "#2196F3",
		borderColor: "#2196F3",
	},
	checkmark: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "bold",
	},
	checkboxLabel: {
		flex: 1,
		fontSize: 13,
		color: "#333",
		fontWeight: "500",
	},
	typeEmoji: {
		fontSize: 16,
	},
	radiusOptions: {
		flexDirection: "row",
		gap: 10,
		flexWrap: "wrap",
	},
	radiusButton: {
		flex: 1,
		minWidth: "22%",
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#ddd",
		alignItems: "center",
	},
	radiusButtonSelected: {
		backgroundColor: "#2196F3",
		borderColor: "#2196F3",
	},
	radiusButtonText: {
		fontSize: 12,
		color: "#333",
		fontWeight: "600",
	},
	radiusButtonTextSelected: {
		color: "#fff",
	},
	sortOptions: {
		gap: 10,
	},
	sortRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
	},
	radio: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: "#ddd",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10,
	},
	radioSelected: {
		borderColor: "#2196F3",
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#2196F3",
	},
	sortLabel: {
		fontSize: 13,
		color: "#333",
		fontWeight: "500",
	},
	info: {
		backgroundColor: "#E3F2FD",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		marginTop: 10,
	},
	infoText: {
		fontSize: 12,
		color: "#1565C0",
		lineHeight: 16,
	},
	footer: {
		flexDirection: "row",
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderTopWidth: 1,
		borderTopColor: "#eee",
		gap: 10,
	},
	button: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: "center",
	},
	resetButton: {
		backgroundColor: "#f5f5f5",
	},
	resetButtonText: {
		fontSize: 13,
		fontWeight: "bold",
		color: "#666",
	},
	applyButton: {
		backgroundColor: "#2196F3",
	},
	applyButtonText: {
		fontSize: 13,
		fontWeight: "bold",
		color: "#fff",
	},
});

export default FilterPanel;
