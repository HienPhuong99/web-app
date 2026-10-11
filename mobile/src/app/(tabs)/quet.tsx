// Quét mã vạch IMEI/serial trên hộp máy, chọn ảnh có mã, dán IMEI đã sao chép, hoặc gõ IMEI / SĐT / tên khách để tra bảo hành tại quầy.
import { useCallback, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import type { TraBaoHanhKQ } from '../../lib/api';
import { chuanHoaMa, goiYMa } from '../../lib/maQuet';
import { KhungTrang } from '../../ui/DanhSach';
import { KhungQuet } from '../../ui/KhungQuet';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { TheMay } from '../../ui/TheMay';
import { mau } from '../../ui/theme';

export default function QuetMan() {
  const { goi } = useAuth();
  const [dangXem, setDangXem] = useState(false);
  const [q, setQ] = useState(''), [kq, setKq] = useState<TraBaoHanhKQ | null>(null), [loi, setLoi] = useState(''), [dangTra, setDangTra] = useState(false);
  const khoa = useRef(false); // đang xử lý một mã: bỏ qua các lần quét trùng liên tiếp

  // Camera chỉ bật khi đang ở tab này (máy chỉ chạy được một camera và đỡ tốn pin)
  useFocusEffect(useCallback(() => { setDangXem(true); return () => setDangXem(false); }, []));

  const tra = async (raw: string) => {
    const ma = chuanHoaMa(raw);
    Keyboard.dismiss();
    setQ(ma); setLoi('');
    if (ma.length < 3) { setLoi('Nhập ít nhất 3 ký tự: IMEI/serial, số điện thoại hoặc tên khách.'); khoa.current = false; return; }
    setDangTra(true);
    try { setKq(await goi<TraBaoHanhKQ>('traBaoHanh', ma)); }
    catch (e) { setLoi((e as Error).message); setKq(null); }
    finally { setDangTra(false); }
  };

  const coMa = (ma: string, tu: 'camera' | 'anh' | 'dan') => {
    if (tu === 'camera') {
      if (khoa.current) return;
      khoa.current = true;
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    tra(ma);
  };

  const quetTiep = () => { setKq(null); setLoi(''); setQ(''); khoa.current = false; };
  const hienCamera = !kq && !dangTra && dangXem;
  const goiY = q && !(kq && kq.tong && kq.q === q) ? goiYMa(q) : ''; // đã tìm thấy máy thì không cần cảnh báo mã

  return (
    <KhungTrang>
      <Text style={s.tieuDe}>Tra bảo hành</Text>
      <Text style={s.phu}>Quét mã vạch IMEI/serial trên hộp máy, chọn ảnh có mã, dán IMEI đã sao chép, hoặc gõ IMEI, số điện thoại, tên khách.</Text>

      {kq || dangTra ? <Nut chu="Quét mã khác" bieuTuong="scan" onPress={quetTiep} style={{ marginBottom: 14 }} testID="quet-tiep" /> : null}
      {!kq && !dangTra ? <KhungQuet bat={hienCamera} onMa={coMa} onLoi={setLoi} /> : null}

      <The style={{ marginBottom: 14 }}>
        <View style={s.hangNhap}>
          <TextInput style={s.o} value={q} onChangeText={setQ} placeholder="IMEI, SĐT hoặc tên khách" placeholderTextColor={mau.xam}
            autoCapitalize="characters" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => tra(q)} testID="o-tra" />
          <Pressable onPress={() => tra(q)} style={s.nutTra} accessibilityLabel="Tra" testID="nut-tra" disabled={dangTra}>
            <Ionicons name="search" size={22} color="#fff" />
          </Pressable>
        </View>
        {goiY ? <Text style={s.goiY}>{goiY}</Text> : null}
        {loi ? <Text style={s.loi} testID="loi-tra">{loi}</Text> : null}
        {dangTra ? <Text style={s.chuNhat}>Đang tra {q}…</Text> : null}
      </The>

      {kq ? (
        <>
          <Text style={s.tieuDeMuc} testID="so-ket-qua">{kq.tong ? `${kq.tong} máy khớp "${kq.q}"` : `Không tìm thấy máy nào khớp "${kq.q}"`}</Text>
          {!kq.tong ? (
            <The nhan="Chưa bán ở cửa hàng" mauNhan={mau.xam}>
              <Text style={s.chuThuong}>Máy này chưa có trong phiếu giao hàng nào. Kiểm tra lại mã, hoặc tra bằng số điện thoại của khách.</Text>
            </The>
          ) : null}
          {kq.ds.map(x => <TheMay key={x.SoPK + x.MaHH + x.IMEI} x={x} />)}
          {kq.tong > kq.ds.length ? <Text style={s.chuNhat}>Chỉ hiện {kq.ds.length} máy giao gần nhất. Gõ thêm ký tự để tra chính xác hơn.</Text> : null}
        </>
      ) : null}
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  tieuDe: { fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5, marginTop: 6 },
  phu: { fontSize: 15, color: mau.chuPhu, marginTop: 4, marginBottom: 16, lineHeight: 21 },
  hangNhap: { flexDirection: 'row', gap: 10 },
  o: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: mau.chu, minWidth: 0 },
  nutTra: { width: 54, borderRadius: 16, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
  goiY: { color: mau.vang, fontSize: 14, marginTop: 10, fontWeight: '600', lineHeight: 19 },
  loi: { color: mau.do, fontSize: 15, marginTop: 10, fontWeight: '600', lineHeight: 21 },
  chuNhat: { fontSize: 14, color: mau.chuNhat, marginTop: 8 },
  chuThuong: { fontSize: 15, color: mau.chuPhu, lineHeight: 21 },
  tieuDeMuc: { fontSize: 18, fontWeight: '800', color: mau.chu, marginBottom: 10, marginLeft: 4 },
});
