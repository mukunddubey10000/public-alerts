import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { FilterOptions, Incident } from "../types";
import { useTheme, Theme } from "../theme/ThemeContext";

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
  const { theme } = useTheme();
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  React.useEffect(() => {
    if (visible) {
      setFilters(currentFilters);
    }
  }, [visible, currentFilters]);

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
    setFilters({
      types: ["ACCIDENT", "OUTAGE", "CONSTRUCTION", "HAZARD"],
      radiusKm: 5,
      sortBy: "distance",
    });
  };

  const s = createThemedStyles(theme);
  const t = theme.colors;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.panel}>
          {/* Handle bar */}
          <View style={s.handleRow}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Filters</Text>
              <Text style={s.subtitle}>Customize your feed</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* Incident Type */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Incident Type</Text>
              {incidentTypes.map((type) => {
                const checked = filters.types.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={s.checkboxRow}
                    onPress={() => toggleType(type)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        s.checkbox,
                        checked && {
                          backgroundColor: t.primary,
                          borderColor: t.primary,
                        },
                      ]}
                    >
                      {checked && <Text style={s.checkmark}>✓</Text>}
                    </View>
                    <Text style={s.checkboxLabel}>{type}</Text>
                    <Text style={s.typeEmoji}>{getEmoji(type)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Radius */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Search Radius</Text>
              <View style={s.radiusRow}>
                {radiusOptions.map((r) => {
                  const sel = filters.radiusKm === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        s.radiusBtn,
                        sel && {
                          backgroundColor: t.primary,
                          borderColor: t.primary,
                        },
                      ]}
                      onPress={() => setFilters((p) => ({ ...p, radiusKm: r }))}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          s.radiusBtnText,
                          sel && { color: t.textInverse },
                        ]}
                      >
                        {r} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Sort By</Text>
              {sortOptions.map((opt) => {
                const sel = filters.sortBy === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={s.radioRow}
                    onPress={() => setFilters((p) => ({ ...p, sortBy: opt }))}
                    activeOpacity={0.7}
                  >
                    <View style={[s.radio, sel && { borderColor: t.primary }]}>
                      {sel && (
                        <View
                          style={[s.radioDot, { backgroundColor: t.primary }]}
                        />
                      )}
                    </View>
                    <Text style={s.radioLabel}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary */}
            <View style={s.infoBox}>
              <Text style={s.infoText}>
                Showing {filters.types.length} type(s) within {filters.radiusKm}{" "}
                km, sorted by {filters.sortBy}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={s.resetBtn}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={s.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={s.applyBtnText}>Apply Filters</Text>
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
      justifyContent: "center",
      alignItems: "center",
    },
    panel: {
      width: "88%",
      maxHeight: "82%",
      backgroundColor: t.surface,
      borderRadius: 24,
      overflow: "hidden",
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
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: t.background,
      marginBottom: 6,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: t.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    checkmark: { color: "#fff", fontSize: 13, fontWeight: "bold" },
    checkboxLabel: { flex: 1, fontSize: 14, color: t.text, fontWeight: "600" },
    typeEmoji: { fontSize: 18 },
    radiusRow: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
    radiusBtn: {
      flex: 1,
      minWidth: "20%",
      paddingVertical: 10,
      marginHorizontal: 4,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.border,
      alignItems: "center",
      backgroundColor: t.background,
    },
    radiusBtnText: { fontSize: 13, color: t.text, fontWeight: "700" },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: t.background,
      marginBottom: 6,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: t.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    radioLabel: { fontSize: 14, color: t.text, fontWeight: "600" },
    infoBox: {
      backgroundColor: t.primary + "15",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 4,
    },
    infoText: {
      fontSize: 12,
      color: t.primary,
      lineHeight: 18,
      fontWeight: "500",
    },
    footer: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: t.separator,
    },
    resetBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      marginRight: 8,
      backgroundColor: t.background,
    },
    resetBtnText: { fontSize: 14, fontWeight: "700", color: t.textSecondary },
    applyBtn: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: t.primary,
    },
    applyBtnText: { fontSize: 14, fontWeight: "700", color: t.textInverse },
  });
};

export default FilterPanel;
