import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Notification } from "../types";
import { useTheme, Theme } from "../theme/ThemeContext";

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
  const { theme } = useTheme();
  const s = createThemedStyles(theme);
  const t = theme.colors;

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
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={s.subtitle}>
                {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
              </Text>
            )}
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {notifications.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Text style={s.emptyIcon}>🔔</Text>
            </View>
            <Text style={s.emptyTitle}>No Notifications</Text>
            <Text style={s.emptyMsg}>
              You'll be notified when new incidents are reported nearby
            </Text>
          </View>
        ) : (
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[s.item, !n.read && { backgroundColor: t.unreadBg }]}
                onPress={() => handleNotificationTap(n)}
                activeOpacity={0.7}
              >
                <View style={s.itemContent}>
                  <View style={s.itemHeader}>
                    <Text
                      style={[
                        s.itemTitle,
                        !n.read && { color: t.primary, fontWeight: "700" },
                      ]}
                      numberOfLines={2}
                    >
                      {n.title}
                    </Text>
                    {!n.read && <View style={s.unreadDot} />}
                  </View>
                  <Text style={s.itemBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                  <Text style={s.itemTime}>{formatTime(n.timestamp)}</Text>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const formatTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const createThemedStyles = (theme: Theme) => {
  const t = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background, paddingTop: 44 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.separator,
    },
    title: { fontSize: 24, fontWeight: "800", color: t.text },
    subtitle: {
      fontSize: 12,
      color: t.primary,
      marginTop: 3,
      fontWeight: "600",
    },
    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.background,
      justifyContent: "center",
      alignItems: "center",
    },
    closeBtnText: { fontSize: 18, color: t.textSecondary },
    list: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
    item: {
      flexDirection: "row",
      backgroundColor: t.cardBg,
      borderRadius: 14,
      padding: 16,
      marginBottom: 8,
      alignItems: "center",
      borderWidth: theme.dark ? 1 : 0,
      borderColor: t.border,
      shadowColor: t.cardShadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme.dark ? 0.3 : 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    itemContent: { flex: 1, marginRight: 10 },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    itemTitle: {
      flex: 1,
      fontSize: 14,
      color: t.textSecondary,
      fontWeight: "500",
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.primary,
      marginLeft: 8,
      marginTop: 4,
    },
    itemBody: {
      fontSize: 13,
      color: t.textSecondary,
      marginBottom: 6,
      lineHeight: 18,
    },
    itemTime: { fontSize: 11, color: t.textMuted },
    arrow: { fontSize: 22, color: t.textMuted },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.primary + "15",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    emptyIcon: { fontSize: 36 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: t.text,
      marginBottom: 8,
    },
    emptyMsg: {
      fontSize: 14,
      color: t.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  });
};

export default NotificationsPanel;
