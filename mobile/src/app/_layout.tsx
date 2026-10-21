// Gốc app: giữ trạng thái đăng nhập; chưa đăng nhập chỉ vào được màn hình đăng nhập, đã đăng nhập thì vào các tab và các màn hình chi tiết.
// Bật khóa Face ID thì phủ màn hình khóa lên trên; bấm vào thông báo thì mở trang mà thông báo trỏ tới.
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '../lib/auth';
import { KhoaProvider, useKhoa } from '../lib/khoa';
import { coThongBao } from '../lib/thongBao';
import { Nen } from '../ui/Nen';
import { Nut } from '../ui/Nut';
import { mau } from '../ui/theme';

// Màn hình chỉ vào được khi đã đăng nhập (route không khai ở đây thì không được bảo vệ)
const MAN_DA_DANG_NHAP = ['(tabs)', 'khach/[ma]', 'thu-tien', 'kho', 'kho/[ma]', 'hop-dong', 'thiet-bi', 'so-lieu', 'so-quy', 'sua-chua', 'sua-chua/[so]', 'kiem-kho', 'tra-hang', 'thu-mua'];

function DieuHuong() {
  const { dangTai, may } = useAuth();
  if (dangTai) {
    return <View style={{ flex: 1 }}><Nen /><ActivityIndicator style={{ flex: 1 }} color={mau.cam} size="large" /></View>;
  }
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: mau.nen1 } }}>
        <Stack.Protected guard={!!may}>
          {MAN_DA_DANG_NHAP.map(ten => <Stack.Screen key={ten} name={ten} options={ten === '(tabs)' ? { animation: 'fade' } : undefined} />)}
        </Stack.Protected>
        <Stack.Protected guard={!may}>
          <Stack.Screen name="dang-nhap" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
      {may && coThongBao ? <MoTuThongBao /> : null}
      {may ? <ManKhoa /> : null}
    </>
  );
}

// Bấm vào thông báo (kể cả khi app đang tắt) → mở trang trong data.url, mặc định Tổng quan
function MoTuThongBao() {
  const r = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!r || r.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.navigate(url as never);
  }, [r]);
  return null;
}

function ManKhoa() {
  const { dangKhoa, moKhoa, tenCach } = useKhoa();
  useEffect(() => { if (dangKhoa) moKhoa().catch(() => {}); }, [dangKhoa, moKhoa]);
  if (!dangKhoa) return null;
  return (
    <View style={StyleSheet.absoluteFill} testID="man-khoa">
      <Nen />
      <View style={s.giua}>
        <View style={s.oKhoa}><Ionicons name="lock-closed" size={40} color={mau.brand} /></View>
        <Text style={s.tieuDe}>phuonghihi đang khóa</Text>
        <Text style={s.phu}>Mở khóa bằng {tenCach || 'Face ID / vân tay'} để tiếp tục.</Text>
        <Nut chu="Mở khóa" bieuTuong={Platform.OS === 'ios' ? 'scan-outline' : 'finger-print'} onPress={() => { moKhoa().catch(() => {}); }} style={{ alignSelf: 'stretch', marginTop: 24 }} />
      </View>
    </View>
  );
}

export default function GocApp() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <KhoaProvider>
          <StatusBar style="dark" />
          <DieuHuong />
        </KhoaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  giua: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, maxWidth: 420, width: '100%', alignSelf: 'center' },
  oKhoa: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  tieuDe: { fontSize: 24, fontWeight: '800', color: mau.chu },
  phu: { fontSize: 16, color: mau.chuPhu, marginTop: 8, textAlign: 'center' },
});
