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
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize, shadows } from "../../theme";

// Lazy-require MapView so the web bundle doesn't crash
let MapViewNative: any = null;
try {
  if (Platform.OS !== "web") {
    MapViewNative = require("react-native-maps").default;
  }
} catch {
  // react-native-maps not available in this build
}

const DEFAULT_REGION = {
  latitude: 23.9742,
  longitude: 121.6017,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
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
  // "map" = map view, "search" = full-screen search results
  const [mode, setMode] = useState<"map" | "search">("map");

  const [region, setRegion] = useState({
    latitude: initialLat ?? DEFAULT_REGION.latitude,
    longitude: initialLng ?? DEFAULT_REGION.longitude,
    latitudeDelta: DEFAULT_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_REGION.longitudeDelta,
  });
  const [label, setLabel] = useState(initialLabel);
  const [geocoding, setGeocoding] = useState(false);
  const [centering, setCentering] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const mapRef = useRef<any>(null);
  const searchInputRef = useRef<TextInput>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialise when modal opens
  useEffect(() => {
    if (!visible) return;
    setMode("map");
    if (initialLat != null && initialLng != null) {
      setRegion((r) => ({ ...r, latitude: initialLat, longitude: initialLng }));
    }
    setLabel(initialLabel);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(false);
    if (initialLat == null) goToMyLocation();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus search input when entering search mode
  useEffect(() => {
    if (mode === "search") {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [mode]);

  // Debounced Nominatim search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchError(false);
      return;
    }
    searchTimer.current = setTimeout(() => doNominatimSearch(searchQuery), 500);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doNominatimSearch(q: string) {
    setSearching(true);
    setSearchError(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "NDHUTaskManagement/1.0",
        },
      });
      const data: NominatimResult[] = await res.json();
      setSearchResults(data);
    } catch {
      setSearchError(true);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function openSearch() {
    setMode("search");
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(false);
  }

  function closeSearch() {
    setMode("map");
    setSearchQuery("");
    setSearchResults([]);
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }

  function selectSearchResult(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    // Switch back to map, then animate
    setMode("map");
    setSearchQuery("");
    setSearchResults([]);
    const clean = result.display_name.split(", ").slice(0, 2).join(", ");
    setLabel(clean);
    // Small delay to let map mount before animating
    setTimeout(() => {
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 600);
    }, 50);
  }

  async function doReverseGeocode(lat: number, lng: number) {
    if (Platform.OS === "web") return;
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (results.length > 0) {
        const r = results[0];
        const name = r.name && !/^\d+$/.test(r.name) ? r.name : null;
        const suggested =
          name ?? r.street ?? r.district ?? r.subregion ?? r.city ?? "Selected location";
        setLabel(suggested);
      }
    } catch {
      // Not critical
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

  // ── Web / maps-not-available fallback ─────────────────────────────────────
  if (Platform.OS === "web" || !MapViewNative) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.webFallback}>
            <Feather name="map" size={32} color={colors.text.tertiary} />
            <Text style={styles.webFallbackText}>
              {Platform.OS === "web"
                ? "Map picker is only available on mobile."
                : "Map not available. Make sure you're using a custom development build."}
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
      onRequestClose={() => {
        if (mode === "search") closeSearch();
        else onClose();
      }}
    >
      <View style={styles.container}>

        {/* ════════════════════════════════════
            MAP MODE
        ════════════════════════════════════ */}
        {mode === "map" && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Map */}
            <View style={styles.mapArea}>
              <MapViewNative
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: region.latitude,
                  longitude: region.longitude,
                  latitudeDelta: region.latitudeDelta,
                  longitudeDelta: region.longitudeDelta,
                }}
                onRegionChangeComplete={handleRegionChangeComplete}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
              />

              {/* Center pin */}
              <View style={styles.centerPinWrap} pointerEvents="none">
                <Feather name="map-pin" size={40} color={colors.accent.default} />
              </View>

              {/* My-location FAB */}
              <Pressable style={styles.myLocBtn} onPress={goToMyLocation}>
                {centering ? (
                  <ActivityIndicator size="small" color={colors.accent.default} />
                ) : (
                  <Feather name="crosshair" size={20} color={colors.accent.default} />
                )}
              </Pressable>
            </View>

            {/* Bottom panel */}
            <View style={styles.bottomPanel}>
              <Text style={styles.panelHint}>Pan the map to fine-tune</Text>

              <View style={styles.labelRow}>
                <Feather name="map-pin" size={15} color={colors.accent.default} style={{ marginTop: 1 }} />
                <TextInput
                  style={styles.labelInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Place name"
                  placeholderTextColor={colors.text.tertiary}
                  returnKeyType="done"
                />
                {geocoding && <ActivityIndicator size="small" color={colors.text.tertiary} />}
              </View>

              <Text style={styles.coords}>
                {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
              </Text>

              <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.confirmBtnText}>Confirm location</Text>
              </Pressable>
            </View>

            {/* Search bar on top of map — tapping opens search mode */}
            <Pressable style={styles.searchBarTrigger} onPress={openSearch}>
              <Pressable style={styles.backBtn} onPress={onClose} hitSlop={12}>
                <Feather name="arrow-left" size={20} color={colors.text.primary} />
              </Pressable>
              <View style={styles.searchBarFake}>
                <Feather name="search" size={15} color={colors.text.tertiary} />
                <Text style={styles.searchBarFakePlaceholder}>
                  {label || "Search for a place…"}
                </Text>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        )}

        {/* ════════════════════════════════════
            SEARCH MODE — full-screen results
        ════════════════════════════════════ */}
        {mode === "search" && (
          <KeyboardAvoidingView
            style={styles.searchScreen}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {/* Search input row */}
            <View style={styles.searchInputRow}>
              <Pressable style={styles.backBtn} onPress={closeSearch} hitSlop={12}>
                <Feather name="arrow-left" size={20} color={colors.text.primary} />
              </Pressable>
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search for a place…"
                placeholderTextColor={colors.text.tertiary}
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (searchQuery.length >= 2) doNominatimSearch(searchQuery);
                }}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searching ? (
                <ActivityIndicator size="small" color={colors.text.tertiary} style={styles.searchEndIcon} />
              ) : searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={8}
                  style={styles.searchEndIcon}
                >
                  <Feather name="x" size={16} color={colors.text.tertiary} />
                </Pressable>
              ) : null}
            </View>

            {/* Results */}
            {searchError ? (
              <View style={styles.emptyState}>
                <Feather name="wifi-off" size={28} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No internet connection</Text>
                <Text style={styles.emptySubText}>Check your connection and try again</Text>
              </View>
            ) : searchResults.length === 0 && searchQuery.length >= 2 && !searching ? (
              <View style={styles.emptyState}>
                <Feather name="map-pin" size={28} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
                <Text style={styles.emptySubText}>Try a different name or spelling</Text>
              </View>
            ) : searchQuery.length < 2 ? (
              <View style={styles.emptyState}>
                <Feather name="search" size={28} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>Type to search</Text>
                <Text style={styles.emptySubText}>
                  Enter a place name, address, or landmark
                </Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => String(item.place_id)}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="none"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultRow}
                    onPress={() => selectSearchResult(item)}
                  >
                    <View style={styles.resultIcon}>
                      <Feather name="map-pin" size={14} color={colors.accent.default} />
                    </View>
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                    <Feather name="chevron-right" size={14} color={colors.text.tertiary} />
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.resultSep} />}
              />
            )}
          </KeyboardAvoidingView>
        )}

      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const SEARCH_TOP = Platform.OS === "ios" ? 52 : 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },

  // ── Map mode ──────────────────────────────────────────────────────────────
  mapArea: {
    flex: 1,
  },
  centerPinWrap: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
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
  // Search bar trigger (overlays map, looks like an input)
  searchBarTrigger: {
    position: "absolute",
    top: SEARCH_TOP,
    left: spacing[4],
    right: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    ...shadows.md,
    overflow: "hidden",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchBarFake: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  searchBarFakePlaceholder: {
    flex: 1,
    color: colors.text.tertiary,
    fontSize: fontSize.base,
  },

  // ── Search mode ───────────────────────────────────────────────────────────
  searchScreen: {
    flex: 1,
    backgroundColor: colors.bg.base,
    paddingTop: SEARCH_TOP,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.elevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
    paddingRight: spacing[3],
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingVertical: spacing[3],
  },
  searchEndIcon: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // Results
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.bg.base,
  },
  resultIcon: {
    width: 28,
    alignItems: "center",
    flexShrink: 0,
  },
  resultText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginRight: spacing[2],
  },
  resultSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginLeft: spacing[4] + 28,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingBottom: 80,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubText: {
    color: colors.text.tertiary,
    fontSize: fontSize.sm,
    textAlign: "center",
  },

  // ── Web fallback ──────────────────────────────────────────────────────────
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
