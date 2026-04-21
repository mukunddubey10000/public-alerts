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
import { useTheme, Theme } from "../theme/ThemeContext";

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
  const { theme } = useTheme();
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

  const s = createThemedStyles(theme);
  const t = theme.colors;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Handle */}
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Report Incident</Text>
              <Text style={s.subtitle}>Help your community stay informed</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* Type Selection */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Type of Incident</Text>
              <View style={s.typeGrid}>
                {incidentTypes.map((type) => {
                  const sel = selectedType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        s.typeBtn,
                        sel && {
                          backgroundColor: t.primary + "20",
                          borderColor: t.primary,
                        },
                      ]}
                      onPress={() => setSelectedType(type)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.typeEmoji}>{getEmoji(type)}</Text>
                      <Text style={[s.typeLabel, sel && { color: t.primary }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Description</Text>
              <TextInput
                style={s.input}
                placeholder="Describe what happened..."
                placeholderTextColor={t.placeholder}
                multiline
                numberOfLines={5}
                value={description}
                onChangeText={setDescription}
                maxLength={500}
              />
              <Text style={s.charCount}>{description.length}/500</Text>
            </View>

            {/* Location */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Location</Text>
              <View style={s.locationBox}>
                <View style={s.locationIconWrap}>
                  <Text style={s.locationEmoji}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.locationCoord}>
                    Lat: {userLocation.lat.toFixed(4)}
                  </Text>
                  <Text style={s.locationCoord}>
                    Lng: {userLocation.lng.toFixed(4)}
                  </Text>
                </View>
                <View style={s.autoTag}>
                  <Text style={s.autoTagText}>Auto</Text>
                </View>
              </View>
              <Text style={s.hint}>
                Location is captured automatically from your device
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={handleClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.submitBtn,
                (!selectedType || !description.trim() || isSubmitting) && {
                  opacity: 0.5,
                },
              ]}
              onPress={handleSubmit}
              disabled={!selectedType || !description.trim() || isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={s.submitBtnText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getEmoji = (type: Incident["type"]): string => {
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

const createThemedStyles = (theme: Theme) => {
  const t = theme.colors;
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: "flex-end",
    },
    modal: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "92%",
      paddingBottom: 20,
    },
    handleRow: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.separator,
    },
    title: { fontSize: 18, fontWeight: "800", color: t.text },
    subtitle: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: t.background,
      justifyContent: "center",
      alignItems: "center",
    },
    closeBtnText: { fontSize: 16, color: t.textSecondary },
    content: { paddingHorizontal: 20, paddingVertical: 16 },
    section: { marginBottom: 22 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: t.textMuted,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    typeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    typeBtn: {
      width: "48%",
      paddingVertical: 18,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: t.background,
      alignItems: "center",
      marginBottom: 10,
      borderWidth: 2,
      borderColor: "transparent",
    },
    typeEmoji: { fontSize: 34, marginBottom: 6 },
    typeLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: t.text,
      textAlign: "center",
    },
    input: {
      borderWidth: 1.5,
      borderColor: t.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: t.inputText,
      backgroundColor: t.inputBg,
      textAlignVertical: "top",
      maxHeight: 150,
    },
    charCount: {
      fontSize: 11,
      color: t.textMuted,
      marginTop: 6,
      textAlign: "right",
    },
    locationBox: {
      flexDirection: "row",
      backgroundColor: t.background,
      padding: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    locationIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: t.primary + "15",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    locationEmoji: { fontSize: 22 },
    locationCoord: {
      fontSize: 13,
      color: t.textSecondary,
      marginVertical: 1,
      fontWeight: "500",
    },
    autoTag: {
      backgroundColor: t.success + "22",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    autoTagText: {
      fontSize: 10,
      fontWeight: "700",
      color: t.success,
      textTransform: "uppercase",
    },
    hint: {
      fontSize: 12,
      color: t.textMuted,
      marginTop: 8,
      fontStyle: "italic",
    },
    footer: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 16 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: t.background,
      marginRight: 10,
    },
    cancelBtnText: { fontSize: 14, fontWeight: "700", color: t.textSecondary },
    submitBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: t.primary,
    },
    submitBtnText: { fontSize: 14, fontWeight: "700", color: t.textInverse },
  });
};

export default ReportModal;
