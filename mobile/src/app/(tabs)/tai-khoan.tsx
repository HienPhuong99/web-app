// Tài khoản đang đăng nhập trên máy này, máy chủ đang dùng, đăng xuất.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { MAY_CHU_MAC_DINH, useAuth } from '../../lib/auth';
import { hoi } from '../../ui/hoi';
import { Nen } from '../../ui/Nen';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { DEM_DUOI, mau } from '../../ui/theme';

export default function TaiKhoanMan() {
  const { user, tenCuaHang, mayChu, dangXuat } = useAuth();
  const [dangChay, setDangChay] = useState(false);
  const thoat = async () => {
    if (!(await hoi('Đăng xuất?', 'Lần sau mở app phải nhập lại mật khẩu.', 'Đăng xuất'))) return;
    setDangChay(true);
    await dangXuat();
  };
  return (
    <View style={{ flex: 1 }}>
      <Nen />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.khung}>
          <Text style={s.tieuDe}>Tài khoản</Text>
          <The style={{ alignItems: 'center', paddingVertical: 26, marginBottom: 14 }}>
            <View style={s.anh}><Text style={s.anhChu}>{(user?.ten || '?').charAt(0).toUpperCase()}</Text></View>
            <Text style={s.ten} testID="tk-ten">{user?.ten}</Text>
            <Text style={s.phu}>{user?.u} · {user?.vaiTro === 'admin' ? 'Quản trị' : 'Nhân viên'}</Text>
            <Text style={s.phu}>{tenCuaHang}</Text>
          </The>
          <The nhan="Máy này" mauNhan={mau.brand} style={{ marginBottom: 14 }}>
            <Text style={s.dong}>Máy chủ: {mayChu === MAY_CHU_MAC_DINH ? 'web app phuonghihi' : mayChu}</Text>
            <Text style={s.dong}>Phiên bản app: {Constants.expoConfig?.version ?? '1.0.0'}</Text>
            <Text style={s.ghiChu}>Mất máy? Trên web, quản trị đặt lại mật khẩu hoặc khóa tài khoản này: mọi điện thoại đang đăng nhập sẽ bị đăng xuất ngay.</Text>
          </The>
          <Nut chu="Đăng xuất" phu nguyHiem bieuTuong="log-out-outline" onPress={thoat} dangChay={dangChay} testID="nut-dang-xuat" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  khung: { padding: 18, paddingBottom: DEM_DUOI, maxWidth: 560, width: '100%', alignSelf: 'center' },
  tieuDe: { fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5, marginTop: 6, marginBottom: 16 },
  anh: { width: 76, height: 76, borderRadius: 38, backgroundColor: mau.brand, alignItems: 'center', justifyContent: 'center' },
  anhChu: { color: '#fff', fontSize: 32, fontWeight: '800' },
  ten: { fontSize: 22, fontWeight: '800', color: mau.chu, marginTop: 12 },
  phu: { fontSize: 15, color: mau.chuPhu, marginTop: 4 },
  dong: { fontSize: 15, color: mau.chu, marginTop: 6 },
  ghiChu: { fontSize: 14, color: mau.chuNhat, marginTop: 12, lineHeight: 20 },
});
