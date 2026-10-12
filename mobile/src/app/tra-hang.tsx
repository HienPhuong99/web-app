// Khách trả máy: máy (IMEI) của một đơn nhập lại kho, đơn giảm theo (trả hết thì hủy đơn), trả lại tiền cho khách nếu đã thu nhiều hơn.
// Mở từ thẻ máy trong hồ sơ khách / kết quả tra bảo hành. Đổi máy = khách trả máy này rồi bán máy khác.
// Đơn lên đời (có máy cũ trừ vào đơn): chỉ trả trong 7 ngày kể từ ngày bán, và cửa hàng trả lại khách đúng máy cũ đã thu.
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { CauHinh } from '../lib/api';
import { ngay, tien } from '../lib/dinhDang';
import { docTien, soTienNhap } from '../lib/gioHang';
import { useDuLieu } from '../lib/useDuLieu';
import { Chip } from '../ui/Chip';
import { ChuLoi, DongTT, KhungTrang } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { KhungCho } from '../ui/TrangThaiTai';
import { mau } from '../ui/theme';

type MayCuTra = { TenHang: string; IMEI: string; GiaThu: number };
type XemTruoc = { SoDH: string; tongCu: number; tongMoi: number; daThu: number; hoanToiDa: number; huy: boolean; mayCuTra?: MayCuTra[]; hanTra?: string };
type KetQua = { SoDH: string; TrangThai: string; TongCong: number; SoPK: string; SoPT: string; hoan: number; huy: boolean; SoPKCu?: string; mayCuTra?: MayCuTra[] };

export default function TraHangMan() {
  const p = useLocalSearchParams<{ don: string; ma: string; ten: string; imei: string; kh?: string; tenKH?: string }>();
  const { goi } = useAuth();
  const ch = useDuLieu<CauHinh>('cauHinhMay', []).du;
  const dong = [{ MaHH: p.ma, TenHang: p.ten, SoLuong: 1, IMEI: p.imei }];
  const [xem, setXem] = useState<XemTruoc | null>(null), [hoan, setHoan] = useState<number | null>(null), [ht, setHt] = useState(''), [ghiChu, setGhiChu] = useState('');
  const [loi, setLoi] = useState(''), [dang, setDang] = useState(false), [xong, setXong] = useState<KetQua | null>(null);
  useEffect(() => {
    goi<XemTruoc>('traHang', { SoDH: p.don, lines: [{ MaHH: p.ma, TenHang: p.ten, SoLuong: 1, IMEI: p.imei }], xemTruoc: true }).then(setXem).catch(e => setLoi((e as Error).message));
  }, [goi, p.don, p.ma, p.ten, p.imei]);
  const soHoan = hoan ?? xem?.hoanToiDa ?? 0, hinhThuc = ht || ch?.hinhThuc[0] || 'Tiền mặt';
  const nhan = async () => {
    setLoi(''); setDang(true);
    try {
      setXong(await goi<KetQua>('traHang', { SoDH: p.don, lines: dong, hoan: { SoTien: soHoan, HinhThuc: hinhThuc }, GhiChu: ghiChu.trim() }));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  if (xong) {
    return (
      <KhungTrang coTab={false}>
        <DauTrang tieuDe="Đã nhận máy trả" />
        <View style={{ alignItems: 'center', marginBottom: 10 }}><Ionicons name="checkmark-circle" size={64} color={mau.xanh} /></View>
        <The style={s.muc} testID="ket-qua-tra">
          <DongTT nhan="Máy" giaTri={`${p.ten} · ${p.imei}`} />
          <DongTT nhan="Nhập lại kho" giaTri={xong.SoPK || '—'} />
          {(xong.mayCuTra ?? []).map(m => <DongTT key={m.IMEI} nhan="Đã trả lại máy cũ" giaTri={`${m.TenHang} · ${m.IMEI}`} dam />)}
          <DongTT nhan="Đơn hàng" giaTri={`${xong.SoDH} · ${xong.huy ? 'đã hủy' : 'còn ' + tien(xong.TongCong)}`} dam />
          <DongTT nhan="Trả lại khách" giaTri={xong.hoan ? `${tien(xong.hoan)} · ${hinhThuc}` : 'Không'} dam />
        </The>
        <Nut chu="Bán máy khác cho khách (đổi máy)" bieuTuong="swap-horizontal" onPress={() => router.navigate({ pathname: '/ban', params: p.kh && p.tenKH ? { ma: p.kh, ten: p.tenKH } : {} })} style={{ marginBottom: 10 }} testID="nut-doi-may" />
        <Nut chu="Xong" phu bieuTuong="checkmark" onPress={() => router.back()} testID="nut-xong-tra" />
      </KhungTrang>
    );
  }
  return (
    <KhungTrang coTab={false}>
      <DauTrang tieuDe="Khách trả máy" phu="Máy nhập lại kho, đơn hàng giảm theo; khách đã trả tiền thì trả lại." />
      <The style={s.muc}>
        <DongTT nhan="Máy" giaTri={p.ten} />
        <DongTT nhan="IMEI / serial" giaTri={p.imei} dam />
        <DongTT nhan="Đơn hàng" giaTri={p.don} />
      </The>
      {!xem && !loi ? <KhungCho dong={2} /> : null}
      {xem ? (
        <The nhan="Tiền" style={s.muc} testID="xem-tra">
          <DongTT nhan="Đơn" giaTri={`${tien(xem.tongCu)} → ${xem.huy ? 'hủy đơn' : tien(xem.tongMoi)}`} />
          <DongTT nhan="Khách đã trả" giaTri={tien(xem.daThu)} />
          {(xem.mayCuTra ?? []).map(m => <DongTT key={m.IMEI} nhan="Trả lại khách máy cũ" giaTri={`${m.TenHang} · ${m.IMEI}`} dam />)}
          {xem.hanTra ? <Text style={s.nhanO} testID="han-tra">Đơn lên đời: nhận trả đến hết ngày {ngay(xem.hanTra)}. Đưa lại khách đúng máy cũ ở trên.</Text> : null}
          <Text style={s.nhanO}>Trả lại khách (tối đa {tien(xem.hoanToiDa)})</Text>
          <TextInput style={s.o} value={soTienNhap(soHoan)} onChangeText={t => setHoan(docTien(t))} keyboardType="number-pad" testID="o-hoan" />
          {soHoan > 0 ? <View style={s.chips}>{(ch?.hinhThuc ?? ['Tiền mặt']).map(h => <Chip key={h} chu={h} chon={h === hinhThuc} onPress={() => setHt(h)} />)}</View> : null}
          <TextInput style={s.o} value={ghiChu} onChangeText={setGhiChu} placeholder="Lý do (vd: đổi ý, máy lỗi đổi máy khác)" placeholderTextColor={mau.xam} />
        </The>
      ) : null}
      <ChuLoi chu={loi} testID="loi-tra" />
      <Nut chu="Nhận máy trả" bieuTuong="return-down-back" onPress={nhan} dangChay={dang} tat={!xem} style={{ marginTop: 12 }} testID="nut-nhan-tra" />
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  nhanO: { fontSize: 13, fontWeight: '700', color: mau.chuPhu, marginTop: 14 },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: mau.chu, marginTop: 10 },
});
