// Khung camera quét mã vạch (tự xin quyền camera), kèm hai nút lấy mã khác: chọn ảnh trong máy, dán chữ đã sao chép.
// Cha tự lo việc bỏ qua các lần quét trùng liên tiếp (camera gọi onMa liên tục khi mã còn trong khung).
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LOAI_MA, maTuAnh, maTuBoNhoTam } from '../lib/layMa';
import { Nut } from './Nut';
import { The } from './The';
import { bo, mau } from './theme';

type Props = { bat: boolean; onMa: (ma: string, tu: 'camera' | 'anh' | 'dan') => void; onLoi: (loi: string) => void; cao?: number; huongDan?: string };

export function KhungQuet({ bat, onMa, onLoi, cao = 260, huongDan = 'Đưa mã vạch IMEI vào giữa khung' }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      {bat ? <Camera onMa={onMa} cao={cao} huongDan={huongDan} /> : null}
      <HangLayMa onMa={onMa} onLoi={onLoi} />
    </View>
  );
}

/** Hai nút nhỏ: Chọn ảnh có mã / Dán IMEI đã sao chép */
export function HangLayMa({ onMa, onLoi }: { onMa: Props['onMa']; onLoi: Props['onLoi'] }) {
  const [dang, setDang] = useState<'' | 'anh' | 'dan'>('');
  const chay = (loai: 'anh' | 'dan') => async () => {
    setDang(loai); onLoi('');
    try {
      const ma = loai === 'anh' ? await maTuAnh() : await maTuBoNhoTam();
      if (ma) onMa(ma, loai);
    } catch (e) { onLoi((e as Error).message); } finally { setDang(''); }
  };
  return (
    <View style={s.hang}>
      <Nut chu="Chọn ảnh" phu bieuTuong="image-outline" onPress={chay('anh')} dangChay={dang === 'anh'} style={{ flex: 1, minHeight: 46 }} testID="nut-anh" />
      <Nut chu="Dán" phu bieuTuong="clipboard-outline" onPress={chay('dan')} dangChay={dang === 'dan'} style={{ flex: 0.7, minHeight: 46 }} testID="nut-dan" />
    </View>
  );
}

function Camera({ onMa, cao, huongDan }: { onMa: Props['onMa']; cao: number; huongDan: string }) {
  const [quyen, xinQuyen] = useCameraPermissions();
  const [den, setDen] = useState(false);
  if (!quyen) return <View style={[s.camera, s.giua, { height: cao }]}><Text style={s.chuNhat}>Đang mở camera…</Text></View>;
  if (!quyen.granted) {
    return (
      <The nhan="Camera" tieuDe="Cho phép dùng camera để quét mã" style={{ marginBottom: 10 }} testID="xin-quyen-camera">
        <Text style={s.chuThuong}>App chỉ dùng camera để đọc mã vạch IMEI/serial, không chụp hay lưu ảnh.</Text>
        {quyen.canAskAgain
          ? <Nut chu="Cho phép dùng camera" bieuTuong="camera" onPress={() => { xinQuyen(); }} style={{ marginTop: 14 }} />
          : <Nut chu="Mở Cài đặt để cấp quyền" phu bieuTuong="settings-outline" onPress={() => { Linking.openSettings(); }} style={{ marginTop: 14 }} />}
      </The>
    );
  }
  return (
    <View style={[s.camera, { height: cao }]}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={den}
        barcodeScannerSettings={{ barcodeTypes: LOAI_MA }} onBarcodeScanned={r => { if (r.data) onMa(r.data, 'camera'); }} />
      <View pointerEvents="none" style={s.khungNgam}>
        {(['tl', 'tr', 'bl', 'br'] as const).map(g => <View key={g} style={[s.goc, s[g]]} />)}
      </View>
      <Text pointerEvents="none" style={s.huongDan}>{huongDan}</Text>
      {Platform.OS !== 'web' ? (
        <Pressable onPress={() => setDen(!den)} style={s.nutDen} accessibilityLabel={den ? 'Tắt đèn' : 'Bật đèn'}>
          <Ionicons name={den ? 'flash' : 'flash-outline'} size={22} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const GOC = 34, NET = 4;
const s = StyleSheet.create({
  hang: { flexDirection: 'row', gap: 10, marginTop: 10 },
  camera: { borderRadius: bo.lon, overflow: 'hidden', backgroundColor: '#1d2939' },
  giua: { alignItems: 'center', justifyContent: 'center' },
  khungNgam: { position: 'absolute', left: '12%', right: '12%', top: '28%', bottom: '28%' },
  goc: { position: 'absolute', width: GOC, height: GOC, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: NET, borderLeftWidth: NET, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: NET, borderRightWidth: NET, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: NET, borderLeftWidth: NET, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: NET, borderRightWidth: NET, borderBottomRightRadius: 14 },
  huongDan: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: '600' },
  nutDen: { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  chuNhat: { fontSize: 14, color: '#d0d5dd' },
  chuThuong: { fontSize: 15, color: mau.chuPhu, lineHeight: 21 },
});
