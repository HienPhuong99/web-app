// Gốc app: giữ trạng thái đăng nhập; chưa đăng nhập chỉ vào được màn hình đăng nhập, đã đăng nhập thì vào các tab.
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { Nen } from '../ui/Nen';
import { mau } from '../ui/theme';

function DieuHuong() {
  const { dangTai, may } = useAuth();
  if (dangTai) {
    return <View style={{ flex: 1 }}><Nen /><ActivityIndicator style={{ flex: 1 }} color={mau.cam} size="large" /></View>;
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: mau.nen1 }, animation: 'fade' }}>
      <Stack.Protected guard={!!may}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!may}>
        <Stack.Screen name="dang-nhap" />
      </Stack.Protected>
    </Stack>
  );
}

export default function GocApp() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <DieuHuong />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
