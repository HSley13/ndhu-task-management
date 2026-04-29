import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize, shadows } from "../../theme";

// Lazy-require MapView so the web bundle doesn't crash
const MapViewNative: any =
  Platform.OS !== "web" ? require("react-native-maps").default : null;

// Default to NDHU campus, Hualien, Taiwan
const DEFAULT_REGION = {
  latitude: 23.9742,
  longitude: 121.6017,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called when user confirms – receives chosen coords + suggested place name */
  onConfirm: (lat: number, lng: number, label: string) => void;
  initialLat?: number;
  initialLng?: number;
  initialLabel?: string;
}

export function MapPickerModal({
  visible,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  initialLabel = "",
}: MapPickerModalProps) {
  const [region, setRegion] = useState({
    latitude: initialLat ?? DEFAULT_REGION.latitude,
    longitude: initialLng ?? DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  });
  const [label, setLabel] = useState(initialLabel);
  const [geocoding, setGeocoding] = useState(false);
  const [centering, setCentering] = useState(false);
  const mapRef = useRef<any>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialise when modal opens
  useEffect(() => {
    if (!visible) return;
    if (initialLat != null && initialLng != null) {
      setRegion((r) => ({ ...r, latitude: initialLat, longitude: initialLng }));
    }
    setLabel(initialLabel);
    if (initialLat == null) goToMyLocation();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doReverseGeocode(lat: number, lng: number) {
    if (Platform.OS === "web") return;
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        // Prefer a real name over a bare street number
        const name =
          r.name && !/^\d+$/.test(r.name) ? r.name : null;
        const suggested =
          name ?? r.street ?? r.district ?? r.subregion ?? r.city ?? "Selected location";
        setLabel(suggested);
      }
    } catch {
      // Geocoding not critical — ignore errors
    }
    setGeocoding(false);
  }

  function handleRegionChangeComplete(r: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) {
    setRegion(r);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(
      () => doReverseGeocode(r.latitude, r.longitude),
      700,
    );
  }

  async function goToMyLocation() {
    setCentering(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const newRegion = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
      mapRef.current?.animateToRegion(newRegion, 500);
      setRegion(newRegion);
      doReverseGeocode(newRegion.latitude, newRegion.longitude);
    } finally {
      setCentering(false);
    }
  }

  function handleConfirm() {
    onConfirm(region.latitude, region.longitude, label.trim() || "Selected location");
    onClose();
  }

  // ── Web fallback ───────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.webFallback}>
            <Feather name="map" size={32} color={colors.text.tertiary} />
            <Text style={styles.webFallbackText}>
              Map picker is only available on mobile.
            </Text>
            <Pressable onPress={onClose} style={styles.webCloseBtn}>
              <Text style={styles.webCloseBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Native map ─────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ── Map area (flex: 1, sits above bottom panel) ── */}
        <View style={styles.mapArea}>
          <MapViewNative
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: initialLat ?? DEFAULT_REGION.latitude,
              longitude: initialLng ?? DEFAULT_REGION.longitude,
              latitudeDelta: DEFAULT_REGION.latitudeDelta,
              longitudeDelta: DEFAULT_REGION.longitudeDelta,
            }}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
          />

          {/* Fixed center pin — centered inside mapArea */}
          <View style={styles.centerPinWrap} pointerEvents="none">
            <Feather name="map-pin" size={40} color={colors.accent.default} />
          </View>

          {/* My-location button — bottom-right of map area */}
          <Pressable style={styles.myLocBtn} onPress={goToMyLocation}>
            {centering ? (
              <ActivityIndicator size="small" color={colors.accent.default} />
            ) : (
              <Feather name="crosshair" size={20} color={colors.accent.default} />
            )}
          </Pressable>
        </View>

        {/* ── Top bar (absolute overlay over map) ── */}
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable style={styles.topBarBtn} onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.topBarTitle}>Pick location</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* ── Bottom panel ── */}
        <View style={styles.bottomPanel}>
          <Text style={styles.panelHint}>Pan the map to choose a location</Text>

          <View style={styles.labelRow}>
            <Feather
              name="map-pin"
              size={15}
              color={colors.accent.default}
              style={{ marginTop: 1 }}
            />
            <TextInput
              style={styles.labelInput}
              value={label}
              onChangeText={setLabel}
              placeholder="Place name"
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="done"
            />
            {geocoding && (
              <ActivityIndicator size="small" color={colors.text.tertiary} />
            )}
          </View>

          <Text style={styles.coords}>
            {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
          </Text>

          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Feather name="check" size={18} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirm location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  mapArea: {
    flex: 1,
  },
  // Fixed center pin — absolutely centered inside mapArea
  centerPinWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    // Offset upward by half the pin height so the tip points to the exact center
    marginBottom: 40,
  },
  // My-location FAB
  myLocBtn: {
    position: "absolute",
    right: spacing[4],
    bottom: spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 52 : 16,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topBarSpacer: { width: 36 },
  // Bottom panel
  bottomPanel: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: Platform.OS === "ios" ? 40 : spacing[5],
    gap: spacing[3],
  },
  panelHint: {
    color: colors.text.tertiary,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  labelInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingVertical: spacing[3],
  },
  coords: {
    color: colors.text.tertiary,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  confirmBtn: {
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  // Web fallback
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[5],
  },
  webFallback: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[3],
    alignItems: "center",
    maxWidth: 320,
  },
  webFallbackText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  webCloseBtn: {
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  webCloseBtnText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
