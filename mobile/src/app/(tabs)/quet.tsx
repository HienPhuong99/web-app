// Quét mã vạch IMEI/serial trên hộp máy (hoặc gõ IMEI, SĐT, tên khách) để tra bảo hành ngay tại quầy.
import { useCallback, useRef, useState } from 'react';
import { Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import type { MayBaoHanh, TraBaoHanhKQ } from '../../lib/api';
import { ngay, tinhTrangBaoHanh, type TinhTrangBH } from '../../lib/dinhDang';
import { chuanHoaMa, goiYMa } from '../../lib/maQuet';
import { Nen } from '../../ui/Nen';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { DEM_DUOI, bo, mau } from '../../ui/theme';

// Mã vạch IMEI/serial trên hộp máy thường là Code 128; thêm vài loại phổ biến khác
const LOAI_MA = ['code128', 'code39', 'ean13', 'upc_a', 'qr', 'datamatrix'] as const;

const MAU_TT: Record<TinhTrangBH['loai'], [string, string]> = {
  con: [mau.xanh, mau.xanhNhat], sap: [mau.vang, mau.vangNhat], het: [mau.do, mau.doNhat], khong: [mau.xam, mau.xamNhat],
};

export default function QuetMan() {
  const { goi } = useAuth();
  const [quyen, xinQuyen] = useCameraPermissions();
  const [dangXem, setDangXem] = useState(false), [den, setDen] = useState(false);
  const [q, setQ] = useState(''), [kq, setKq] = useState<TraBaoHanhKQ | null>(null), [loi, setLoi] = useState(''), [dangTra, setDangTra] = useState(false);
  const khoa = useRef(false); // đang xử lý một mã: bỏ qua các lần quét trùng liên tiếp

  // Camera chỉ bật khi đang ở tab này (máy chỉ chạy được một camera và đỡ tốn pin)
  useFocusEffect(useCallback(() => { setDangXem(true); return () => { setDangXem(false); setDen(false); }; }, []));

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

  const daQuet = (r: BarcodeScanningResult) => {
    if (khoa.current || !r.data) return;
    khoa.current = true;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    tra(r.data);
  };

  const quetTiep = () => { setKq(null); setLoi(''); setQ(''); khoa.current = false; };
  const hienCamera = !kq && !dangTra && dangXem;
  const goiY = q && !(kq && kq.tong && kq.q === q) ? goiYMa(q) : ''; // đã tìm thấy máy thì không cần cảnh báo mã

  return (
    <View style={{ flex: 1 }}>
      <Nen />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.khung} keyboardShouldPersistTaps="handled">
          <Text style={s.tieuDe}>Tra bảo hành</Text>
          <Text style={s.phu}>Quét mã vạch IMEI/serial trên hộp máy, hoặc gõ IMEI, số điện thoại, tên khách.</Text>

          {hienCamera ? (
            <KhungCamera quyen={quyen} xinQuyen={xinQuyen} den={den} setDen={setDen} daQuet={daQuet} />
          ) : (
            <Nut chu="Quét mã khác" bieuTuong="scan" onPress={quetTiep} style={{ marginBottom: 14 }} testID="quet-tiep" />
          )}

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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function KhungCamera({ quyen, xinQuyen, den, setDen, daQuet }: {
  quyen: ReturnType<typeof useCameraPermissions>[0]; xinQuyen: () => Promise<unknown>; den: boolean; setDen: (v: boolean) => void;
  daQuet: (r: BarcodeScanningResult) => void;
}) {
  if (!quyen) return <View style={[s.camera, s.giua]}><Text style={s.chuNhat}>Đang mở camera…</Text></View>;
  if (!quyen.granted) {
    return (
      <The nhan="Camera" tieuDe="Cho phép dùng camera để quét mã" style={{ marginBottom: 14 }} testID="xin-quyen-camera">
        <Text style={s.chuThuong}>App chỉ dùng camera để đọc mã vạch IMEI/serial, không chụp hay lưu ảnh.</Text>
        {quyen.canAskAgain
          ? <Nut chu="Cho phép dùng camera" bieuTuong="camera" onPress={() => { xinQuyen(); }} style={{ marginTop: 14 }} />
          : <Nut chu="Mở Cài đặt để cấp quyền" phu bieuTuong="settings-outline" onPress={() => { Linking.openSettings(); }} style={{ marginTop: 14 }} />}
      </The>
    );
  }
  return (
    <View style={s.camera}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={den}
        barcodeScannerSettings={{ barcodeTypes: [...LOAI_MA] }} onBarcodeScanned={daQuet} />
      <View pointerEvents="none" style={s.khungNgam}>
        {(['tl', 'tr', 'bl', 'br'] as const).map(g => <View key={g} style={[s.goc, s[g]]} />)}
      </View>
      <Text pointerEvents="none" style={s.huongDan}>Đưa mã vạch IMEI vào giữa khung</Text>
      {Platform.OS !== 'web' ? (
        <Pressable onPress={() => setDen(!den)} style={s.nutDen} accessibilityLabel={den ? 'Tắt đèn' : 'Bật đèn'}>
          <Ionicons name={den ? 'flash' : 'flash-outline'} size={22} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function TheMay({ x }: { x: MayBaoHanh }) {
  const tt = tinhTrangBaoHanh(x), [chuTT, nenTT] = MAU_TT[tt.loai];
  return (
    <The style={{ marginBottom: 12 }} testID="the-may">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Text style={[s.tenMay, { flex: 1 }]}>{x.TenHang}</Text>
        <View style={[s.nhanTT, { backgroundColor: nenTT }]}><Text style={[s.nhanTTChu, { color: chuTT }]} testID="tinh-trang">{tt.nhan}</Text></View>
      </View>
      <Dong nhan="IMEI/serial" giaTri={x.IMEIKhop || x.IMEI || '—'} dam />
      <Dong nhan="Khách" giaTri={x.TenKH || 'Khách lẻ'} />
      {x.SDT ? <Dong nhan="Điện thoại" giaTri={x.SDT} goi /> : null}
      <Dong nhan="Ngày giao" giaTri={ngay(x.Ngay)} />
      <Dong nhan="Hết bảo hành" giaTri={x.HetHan ? ngay(x.HetHan) : 'Không bảo hành'} />
      <Dong nhan="Chứng từ" giaTri={[x.SoDH && 'Đơn ' + x.SoDH, 'Phiếu ' + x.SoPK].filter(Boolean).join(' · ')} />
    </The>
  );
}

function Dong({ nhan, giaTri, dam, goi }: { nhan: string; giaTri: string; dam?: boolean; goi?: boolean }) {
  return (
    <View style={s.dong}>
      <Text style={s.dongNhan}>{nhan}</Text>
      {goi ? (
        <Pressable onPress={() => Linking.openURL('tel:' + giaTri.replace(/[^\d+]/g, ''))} style={{ flex: 1 }}>
          <Text style={[s.dongGiaTri, { color: mau.brand, textDecorationLine: 'underline' }]}>{giaTri}</Text>
        </Pressable>
      ) : <Text style={[s.dongGiaTri, dam && { fontWeight: '800', fontVariant: ['tabular-nums'] }]} selectable>{giaTri}</Text>}
    </View>
  );
}

const GOC = 34, NET = 4;
const s = StyleSheet.create({
  khung: { padding: 18, paddingBottom: DEM_DUOI, maxWidth: 560, width: '100%', alignSelf: 'center' },
  tieuDe: { fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5, marginTop: 6 },
  phu: { fontSize: 15, color: mau.chuPhu, marginTop: 4, marginBottom: 16, lineHeight: 21 },
  camera: { height: 280, borderRadius: bo.lon, overflow: 'hidden', backgroundColor: '#1d2939', marginBottom: 14 },
  giua: { alignItems: 'center', justifyContent: 'center' },
  khungNgam: { position: 'absolute', left: '12%', right: '12%', top: '28%', bottom: '28%' },
  goc: { position: 'absolute', width: GOC, height: GOC, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: NET, borderLeftWidth: NET, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: NET, borderRightWidth: NET, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: NET, borderLeftWidth: NET, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: NET, borderRightWidth: NET, borderBottomRightRadius: 14 },
  huongDan: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: '600' },
  nutDen: { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  hangNhap: { flexDirection: 'row', gap: 10 },
  o: { flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: mau.chu },
  nutTra: { width: 54, borderRadius: 16, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
  goiY: { color: mau.vang, fontSize: 14, marginTop: 10, fontWeight: '600', lineHeight: 19 },
  loi: { color: mau.do, fontSize: 15, marginTop: 10, fontWeight: '600' },
  chuNhat: { fontSize: 14, color: mau.chuNhat, marginTop: 8 },
  chuThuong: { fontSize: 15, color: mau.chuPhu, lineHeight: 21 },
  tieuDeMuc: { fontSize: 18, fontWeight: '800', color: mau.chu, marginBottom: 10, marginLeft: 4 },
  tenMay: { fontSize: 18, fontWeight: '800', color: mau.chu },
  nhanTT: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  nhanTTChu: { fontSize: 13, fontWeight: '800' },
  dong: { flexDirection: 'row', paddingTop: 10, gap: 12 },
  dongNhan: { width: 104, fontSize: 14, color: mau.chuNhat, fontWeight: '600' },
  dongGiaTri: { flex: 1, fontSize: 15, color: mau.chu, fontWeight: '600' },
});
