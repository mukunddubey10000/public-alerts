import React from "react";
import {
	View,
	Text,
	StyleSheet,
	Modal,
	ScrollView,
	TouchableOpacity,
	Alert,
} from "react-native";
import { Notification } from "../types";

interface NotificationsPanelProps {
	visible: boolean;
	notifications: Notification[];
	unreadCount: number;
	onClose: () => void;
	onNotificationPress: (notification: Notification) => void;
	onMarkAsRead: (notificationId: string) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
	visible,
	notifications,
	unreadCount,
	onClose,
	onNotificationPress,
	onMarkAsRead,
}) => {
	const handleNotificationTap = (notification: Notification) => {
		if (!notification.read) {
			onMarkAsRead(notification.id);
		}
		onNotificationPress(notification);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={false}
			onRequestClose={onClose}
		>
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<View>
						<Text style={styles.title}>Notifications</Text>
						{unreadCount > 0 && (
							<Text style={styles.subtitle}>
								{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
							</Text>
						)}
					</View>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.closeButton}>✕</Text>
					</TouchableOpacity>
				</View>

				{/* Notifications List */}
				{notifications.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.emptyStateEmoji}>🔔</Text>
						<Text style={styles.emptyStateTitle}>No Notifications</Text>
						<Text style={styles.emptyStateMessage}>
							You'll be notified when new incidents are reported nearby
						</Text>
					</View>
				) : (
					<ScrollView style={styles.notificationsList}>
						{notifications.map((notification) => (
							<TouchableOpacity
								key={notification.id}
								style={[
									styles.notificationItem,
									!notification.read && styles.notificationItemUnread,
								]}
								onPress={() => handleNotificationTap(notification)}
							>
								<View style={styles.notificationContent}>
									<View style={styles.notificationHeader}>
										<Text
											style={[
												styles.notificationTitle,
												!notification.read && styles.notificationTitleUnread,
											]}
											numberOfLines={2}
										>
											{notification.title}
										</Text>
										{!notification.read && <View style={styles.unreadDot} />}
									</View>
									<Text style={styles.notificationBody} numberOfLines={2}>
										{notification.body}
									</Text>
									<Text style={styles.notificationTime}>
										{formatNotificationTime(notification.timestamp)}
									</Text>
								</View>
								<Text style={styles.notificationArrow}>›</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				)}
			</View>
		</Modal>
	);
};

const formatNotificationTime = (timestamp: number): string => {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;

	const date = new Date(timestamp);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
		paddingTop: 40, // Account for status bar
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		paddingHorizontal: 20,
		paddingVertical: 15,
		backgroundColor: "#fff",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	title: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#333",
	},
	subtitle: {
		fontSize: 12,
		color: "#999",
		marginTop: 3,
	},
	closeButton: {
		fontSize: 28,
		color: "#999",
	},
	notificationsList: {
		flex: 1,
		paddingHorizontal: 15,
		paddingVertical: 10,
	},
	notificationItem: {
		flexDirection: "row",
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 15,
		marginVertical: 6,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 1.5,
		elevation: 2,
	},
	notificationItemUnread: {
		backgroundColor: "#E3F2FD",
	},
	notificationContent: {
		flex: 1,
		marginRight: 10,
	},
	notificationHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 5,
	},
	notificationTitle: {
		flex: 1,
		fontSize: 13,
		color: "#666",
		fontWeight: "500",
	},
	notificationTitleUnread: {
		color: "#1565C0",
		fontWeight: "bold",
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: "#2196F3",
		marginLeft: 8,
	},
	notificationBody: {
		fontSize: 12,
		color: "#555",
		marginBottom: 6,
		lineHeight: 16,
	},
	notificationTime: {
		fontSize: 11,
		color: "#999",
	},
	notificationArrow: {
		fontSize: 20,
		color: "#ccc",
		marginLeft: 10,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 20,
	},
	emptyStateEmoji: {
		fontSize: 48,
		marginBottom: 15,
	},
	emptyStateTitle: {
		fontSize: 16,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 8,
	},
	emptyStateMessage: {
		fontSize: 13,
		color: "#999",
		textAlign: "center",
		lineHeight: 18,
	},
});

export default NotificationsPanel;
