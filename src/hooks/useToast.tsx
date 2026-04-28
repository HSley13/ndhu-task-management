import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
} from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import EventEmitter from "eventemitter3";
import { colors, spacing, radius, fontSize } from "../theme";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show(message: string, type?: ToastType, duration?: number): void;
}

const ToastContext = createContext<ToastContextValue>({
  show: () => undefined,
});

export const toastEmitter = new EventEmitter<{
  show: [{ message: string; type: ToastType }];
}>();

let _counter = 0;

function ToastEntry({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(
      80,
      { damping: 14, stiffness: 200 },
      (finished) => {
        if (finished) runOnJS(onDismiss)(item.id);
      },
    );
  }, [item.id, onDismiss]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const bgColor =
    item.type === "success"
      ? colors.success
      : item.type === "error"
        ? colors.danger
        : colors.info;

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bgColor }, style]}>
      <Text style={styles.toastText} numberOfLines={2}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const show = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = String(++_counter);
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for programmatic toasts from services
  React.useEffect(() => {
    const handler = ({
      message,
      type,
    }: {
      message: string;
      type: ToastType;
    }) => {
      show(message, type);
    };
    toastEmitter.on("show", handler);
    return () => {
      toastEmitter.off("show", handler);
    };
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((item) => (
          <ToastEntry key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    left: spacing[4],
    right: spacing[4],
    gap: spacing[2],
    zIndex: 9998,
  },
  toast: {
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
