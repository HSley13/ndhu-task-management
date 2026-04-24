import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, Keyboard,
  KeyboardAvoidingView, Image, Platform, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing, radius, fontSize, shadows } from '../theme';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../hooks/useToast';

export function LoginScreen() {
  const { login, is_loading: isLoading, error } = useAuthStore();
  const { show } = useToast();

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const logoScale  = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    logoScale.value  = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 500 });
    formOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  useEffect(() => {
    if (error) {
      show(error, 'error');
      shakeX.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10,  { duration: 60 }),
        withTiming(-8,  { duration: 50 }),
        withTiming(8,   { duration: 50 }),
        withTiming(0,   { duration: 40 }),
      );
    }
  }, [error]);

  const logoStyle  = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }], opacity: logoOpacity.value }));
  const formStyle  = useAnimatedStyle(() => ({ opacity: formOpacity.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  async function handleLogin() {
    Keyboard.dismiss();
    if (!studentId.trim() || !password.trim()) {
      show('Please enter your student ID and password', 'error');
      return;
    }
    await login(studentId.trim(), password.trim());
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <Animated.View style={[styles.logoArea, logoStyle]}>
          <View style={styles.logoCircle}>
            <Feather name="check-square" size={40} color={colors.accent.default} />
          </View>
          <Text style={styles.appName}>NDHU Assistant</Text>
          <Text style={styles.tagline}>Your academic tasks, organized</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[styles.form, formStyle, shakeStyle]}>
          <Input
            value={studentId}
            onChangeText={setStudentId}
            placeholder="Student ID"
            keyboardType="numeric"
            returnKeyType="next"
            autoCapitalize="none"
            autoCorrect={false}
            icon={<Feather name="user" size={18} color={colors.text.tertiary} />}
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            onSubmitEditing={handleLogin}
            icon={<Feather name="lock" size={18} color={colors.text.tertiary} />}
            rightAction={
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.text.tertiary}
                />
              </Pressable>
            }
          />
          <Button
            label="Sign In with Moodle"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!studentId.trim() || !password.trim()}
          />
        </Animated.View>

        <Text style={styles.footer}>
          Uses your NDHU Moodle credentials. Your password is never stored.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[10],
    gap: spacing[8],
  },
  logoArea: {
    alignItems: 'center',
    gap: spacing[3],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent.muted,
    ...shadows.glow,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.base,
    color: colors.text.tertiary,
  },
  form: {
    gap: spacing[4],
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: fontSize.xs * 1.6,
  },
});
