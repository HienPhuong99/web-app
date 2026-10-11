// Đăng nhập bằng tài khoản của web app. "Máy chủ" chỉ cần đổi khi chạy thử với dev/chay-thu.js.
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { goiApi } from '../lib/api';
import { MAY_CHU_MAC_DINH, useAuth } from '../lib/auth';
import { Nen } from '../ui/Nen';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { mau } from '../ui/theme';

export default function DangNhap() {
  const { dangNhap, mayChu, doiMayChu, tenCuaHang } = useAuth();
  const [ten, setTen] = useState(''), [mk, setMk] = useState(''), [hienMk, setHienMk] = useState(false);
  const [loi, setLoi] = useState(''), [dangChay, setDangChay] = useState(false);
  const [moMayChu, setMoMayChu] = useState(false), [nhapMayChu, setNhapMayChu] = useState(mayChu);
  const [cuaHang, setCuaHang] = useState({ ten: tenCuaHang, moTa: 'Quản lý bán hàng' });
  const oMk = useRef<TextInput>(null);

  useEffect(() => { // tên cửa hàng mới nhất (không cần đăng nhập); lỗi mạng thì giữ tên đã lưu
    goiApi<{ ten: string; moTa: string }>(mayChu, { fn: 'thongTinDangNhap' }, 15000).then(setCuaHang).catch(() => {});
  }, [mayChu]);

  const gui = async () => {
    setLoi(''); setDangChay(true);
    try { await dangNhap(ten, mk); } catch (e) { setLoi((e as Error).message); setDangChay(false); }
  };
  const luuMayChu = async () => {
    try { await doiMayChu(nhapMayChu); setMoMayChu(false); setLoi(''); } catch (e) { setLoi((e as Error).message); }
  };

  return (
    <View style={{ flex: 1 }}>
      <Nen />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.khung} keyboardShouldPersistTaps="handled">
            <LinearGradient colors={['#FF9466', mau.cam, '#F0446B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}>
              <Ionicons name="phone-portrait" size={38} color="#fff" />
            </LinearGradient>
            <Text style={s.ten} testID="ten-cua-hang">{cuaHang.ten}</Text>
            <Text style={s.moTa}>{cuaHang.moTa}</Text>

            <The style={{ marginTop: 28 }}>
              <Text style={s.nhanO}>Tên đăng nhập</Text>
              <TextInput style={s.o} value={ten} onChangeText={setTen} autoCapitalize="none" autoCorrect={false} autoComplete="username"
                textContentType="username" returnKeyType="next" onSubmitEditing={() => oMk.current?.focus()} placeholder="vd. admin"
                placeholderTextColor={mau.xam} testID="o-ten" />
              <Text style={[s.nhanO, { marginTop: 14 }]}>Mật khẩu</Text>
              <View>
                <TextInput ref={oMk} style={[s.o, { paddingRight: 52 }]} value={mk} onChangeText={setMk} secureTextEntry={!hienMk}
                  autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={gui} testID="o-mk" />
                <Pressable onPress={() => setHienMk(v => !v)} style={s.mat} accessibilityLabel={hienMk ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} hitSlop={8}>
                  <Ionicons name={hienMk ? 'eye-off-outline' : 'eye-outline'} size={22} color={mau.chuPhu} />
                </Pressable>
              </View>
              {loi ? <Text style={s.loi} testID="loi">{loi}</Text> : null}
              <Nut chu="Đăng nhập" onPress={gui} dangChay={dangChay} style={{ marginTop: 18 }} testID="nut-dang-nhap" />
            </The>

            <Pressable onPress={() => { setMoMayChu(v => !v); setNhapMayChu(mayChu); }} style={s.moRong} testID="mo-may-chu">
              <Ionicons name="server-outline" size={15} color={mau.chuNhat} />
              <Text style={s.moRongChu}>Máy chủ{mayChu !== MAY_CHU_MAC_DINH ? ' (đang dùng máy chủ khác)' : ''}</Text>
            </Pressable>
            {moMayChu ? (
              <The>
                <Text style={s.nhanO}>Địa chỉ máy chủ</Text>
                <TextInput style={[s.o, { fontSize: 14 }]} value={nhapMayChu} onChangeText={setNhapMayChu} autoCapitalize="none" autoCorrect={false}
                  keyboardType="url" multiline testID="o-may-chu" />
                <Text style={s.goiY}>Chỉ đổi khi chạy thử trên máy tính: http://&lt;IP máy tính&gt;:5178/api. Để trống là dùng link web app thật.</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Nut chu="Mặc định" phu onPress={() => setNhapMayChu(MAY_CHU_MAC_DINH)} style={{ flex: 1 }} />
                  <Nut chu="Lưu" onPress={luuMayChu} style={{ flex: 1 }} testID="luu-may-chu" />
                </View>
              </The>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  khung: { padding: 22, paddingTop: 48, alignItems: 'stretch', maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { width: 84, height: 84, borderRadius: 28, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  ten: { fontSize: 32, fontWeight: '800', color: mau.chu, textAlign: 'center', marginTop: 18, letterSpacing: -0.5 },
  moTa: { fontSize: 16, color: mau.chuPhu, textAlign: 'center', marginTop: 4 },
  nhanO: { fontSize: 14, fontWeight: '700', color: mau.chuPhu, marginBottom: 6 },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, color: mau.chu },
  mat: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  loi: { color: mau.do, marginTop: 12, fontSize: 15, fontWeight: '600' },
  moRong: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 18 },
  moRongChu: { color: mau.chuNhat, fontSize: 14, fontWeight: '600' },
  goiY: { color: mau.chuNhat, fontSize: 13, marginTop: 8, lineHeight: 18 },
});
