// Kiểm kho: quét liên tục IMEI/serial các máy trên kệ (hoặc gõ / dán), rồi so với tồn kho: máy thiếu (trong kho mà không thấy),
// mã lạ (đã bán / chưa nhập). Lưu kết quả vào nhật ký để đối chiếu sau.
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { ngay } from '../lib/dinhDang';
import { chuanHoaMa } from '../lib/maQuet';
import { ChuLoi, ChuNhat, Dong, KhungTrang, TieuDeMuc, Vach } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { KhungQuet } from '../ui/KhungQuet';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { hoi } from '../ui/hoi';
import { mau } from '../ui/theme';

type May = { IMEI: string; MaHH: string; TenHang: string; SoPK?: string; Ngay?: string; lyDo?: string };
type KetQua = { soQuet: number; khop: number; thieu: May[]; la: May[]; theoHang: { MaHH: string; TenHang: string; trongKho: number; thay: number }[] };

export default function KiemKhoMan() {
  const { goi } = useAuth();
  const [ds, setDs] = useState<string[]>([]), [go, setGo] = useState(''), [camera, setCamera] = useState(false), [focus, setFocus] = useState(false);
  const [kq, setKq] = useState<KetQua | null>(null), [loi, setLoi] = useState(''), [dang, setDang] = useState(false), [daLuu, setDaLuu] = useState(false);
  const vua = useRef('');
  useFocusEffect(useCallback(() => { setFocus(true); return () => setFocus(false); }, []));

  const them = (raw: string) => {
    const ma = chuanHoaMa(raw);
    if (ma.length < 4) return setLoi('Mã quá ngắn.');
    setLoi(''); setKq(null); setDaLuu(false);
    setDs(d => (d.includes(ma) ? d : [ma, ...d]));
  };
  const coMa = (raw: string, tu: 'camera' | 'anh' | 'dan') => {
    const ma = chuanHoaMa(raw);
    if (tu === 'camera') {
      if (ma === vua.current) return; // camera gọi liên tục khi mã còn trong khung
      vua.current = ma;
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    }
    them(ma);
  };
  const soSanh = async (luu: boolean) => {
    if (!ds.length) return setLoi('Chưa quét máy nào.');
    setDang(true); setLoi('');
    try { setKq(await goi<KetQua>('kiemKho', ds, { luu })); if (luu) setDaLuu(true); } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  const lamLai = async () => { if (await hoi('Kiểm lại từ đầu?', 'Xóa danh sách mã đã quét.', 'Xóa')) { setDs([]); setKq(null); vua.current = ''; } };

  return (
    <KhungTrang coTab={false}>
      <DauTrang tieuDe="Kiểm kho" phu="Quét lần lượt từng máy trên kệ rồi so với tồn kho để biết máy nào thiếu, máy nào lạ." />
      <The nhan={`Đã quét ${ds.length} máy`} mauNhan={mau.brand} style={s.muc} testID="the-kiem-kho">
        <View style={s.hang}>
          <TextInput style={s.o} value={go} onChangeText={setGo} placeholder="Gõ IMEI / serial" placeholderTextColor={mau.xam} autoCapitalize="characters" autoCorrect={false}
            returnKeyType="done" onSubmitEditing={() => { them(go); setGo(''); }} testID="o-kiem" />
          <Pressable onPress={() => { them(go); setGo(''); }} style={s.nut} accessibilityLabel="Thêm mã" testID="nut-them-kiem"><Ionicons name="add" size={24} color="#fff" /></Pressable>
          <Pressable onPress={() => setCamera(!camera)} style={[s.nut, { backgroundColor: camera ? mau.chu : mau.brand }]} accessibilityLabel={camera ? 'Tắt camera' : 'Quét bằng camera'}>
            <Ionicons name={camera ? 'close' : 'scan'} size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={{ marginTop: camera ? 12 : 0 }}>
          <KhungQuet bat={camera && focus} onMa={coMa} onLoi={setLoi} cao={200} huongDan="Quét liên tục từng máy" />
        </View>
        {ds.slice(0, 5).map(m => <Text key={m} style={s.ma}>{m}</Text>)}
        {ds.length > 5 ? <ChuNhat chu={`… và ${ds.length - 5} mã khác`} /> : null}
        <ChuLoi chu={loi} testID="loi-kiem" />
        <View style={[s.hang, { marginTop: 12 }]}>
          <Nut chu="So với tồn kho" bieuTuong="git-compare-outline" onPress={() => soSanh(false)} dangChay={dang} style={{ flex: 2 }} testID="nut-so-sanh" />
          {ds.length ? <Nut chu="Làm lại" phu onPress={lamLai} style={{ flex: 1 }} /> : null}
        </View>
      </The>
      {kq ? (
        <>
          <The style={s.muc} testID="kq-kiem">
            <View style={s.bo}>
              <O so={kq.khop} nhan="Khớp" mauSo={mau.xanh} />
              <O so={kq.thieu.length} nhan="Thiếu" mauSo={kq.thieu.length ? mau.do : mau.chu} />
              <O so={kq.la.length} nhan="Lạ" mauSo={kq.la.length ? mau.vang : mau.chu} />
            </View>
            <Nut chu={daLuu ? 'Đã lưu vào nhật ký' : 'Lưu kết quả vào nhật ký'} phu bieuTuong="save-outline" tat={daLuu} onPress={() => soSanh(true)} style={{ marginTop: 14, minHeight: 46 }} testID="nut-luu-kiem" />
          </The>
          <TieuDeMuc chu="Theo mặt hàng" />
          <The style={[s.muc, { paddingVertical: 6 }]}>
            {kq.theoHang.map((h, i) => (
              <View key={h.MaHH}>{i ? <Vach /> : null}
                <Dong chinh={h.TenHang} phu={`Trong kho ${h.trongKho} · quét thấy ${h.thay}`} ben={h.trongKho - h.thay ? `Thiếu ${h.trongKho - h.thay}` : 'Đủ'} benMau={h.trongKho - h.thay ? mau.do : mau.xanh} />
              </View>
            ))}
            {!kq.theoHang.length ? <ChuNhat chu="Kho không có máy nào ghi IMEI." style={{ marginVertical: 10 }} /> : null}
          </The>
          {kq.thieu.length ? <TieuDeMuc chu={`Máy thiếu (${kq.thieu.length})`} /> : null}
          {kq.thieu.length ? (
            <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-thieu">
              {kq.thieu.slice(0, 100).map((m, i) => <View key={m.IMEI}>{i ? <Vach /> : null}<Dong chinh={m.IMEI} phu={`${m.TenHang} · nhập ${m.SoPK} ${m.Ngay ? ngay(m.Ngay) : ''}`} /></View>)}
            </The>
          ) : null}
          {kq.la.length ? <TieuDeMuc chu={`Mã lạ (${kq.la.length})`} /> : null}
          {kq.la.length ? (
            <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-la">
              {kq.la.map((m, i) => <View key={m.IMEI}>{i ? <Vach /> : null}<Dong chinh={m.IMEI} phu={[m.TenHang, m.lyDo].filter(Boolean).join(' · ')} /></View>)}
            </The>
          ) : null}
        </>
      ) : null}
    </KhungTrang>
  );
}

const O = ({ so, nhan, mauSo }: { so: number; nhan: string; mauSo: string }) => (
  <View style={{ flex: 1, alignItems: 'center' }}><Text style={[s.so, { color: mauSo }]}>{so}</Text><Text style={s.nhan}>{nhan}</Text></View>
);

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  hang: { flexDirection: 'row', gap: 8 },
  o: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: mau.chu },
  nut: { width: 50, borderRadius: 14, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
  ma: { fontSize: 15, color: mau.chuPhu, marginTop: 8, fontVariant: ['tabular-nums'] },
  bo: { flexDirection: 'row' },
  so: { fontSize: 26, fontWeight: '800' },
  nhan: { fontSize: 13, color: mau.chuNhat, fontWeight: '600' },
});
