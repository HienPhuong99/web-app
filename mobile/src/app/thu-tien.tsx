// Thu tiền của một khách: chọn đơn còn nợ (hoặc thu chung), số tiền, hình thức; chuyển khoản thì hiện mã VietQR cho khách quét.
// Lưu phiếu thu ngày hôm nay (API luuThuTien).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { CauHinh, DsKhach, HoSoKhach, KhachNo, PhieuThu, TongQuan } from '../lib/api';
import { homNay, ngay, tien } from '../lib/dinhDang';
import { docTien, soTienNhap } from '../lib/gioHang';
import { boDau } from '../lib/lienHe';
import { ghiThuThem, taoMaGhi } from '../lib/ghiMotLan';
import { dsKhachDoiNo, hoSoSauThu, khachNoSauThu, tongQuanSauThu } from '../lib/sauGhi';
import { useDuLieu, useSuaBoNho } from '../lib/useDuLieu';
import { Chip } from '../ui/Chip';
import { ChuLoi, ChuNhat, DongTT, KhungTrang } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { MaQR } from '../ui/MaQR';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { KhungCho } from '../ui/TrangThaiTai';
import { mau } from '../ui/theme';

export default function ThuTienMan() {
  const { ma, don } = useLocalSearchParams<{ ma: string; don?: string }>();
  const { goiGhi } = useAuth();
  const maGhi = useRef(''); // mã lần gửi: thử lại sau lỗi mạng không ghi phiếu thứ hai
  // Hồ sơ khách thường đã có sẵn (vừa mở từ hồ sơ): hiện ngay, cập nhật ở nền
  const dlHs = useDuLieu<HoSoKhach>('chiTietKhach', [ma]), hs = dlHs.du, ch = useDuLieu<CauHinh>('cauHinhMay', []).du;
  const boNho = useSuaBoNho();
  const [soDH, setSoDH] = useState(don || ''), [soTien, setSoTien] = useState<number | null>(null), [hinhThuc, setHinhThuc] = useState('Tiền mặt'), [ghiChu, setGhiChu] = useState('');
  const [loi, setLoi] = useState(''), [dang, setDang] = useState(false), [xong, setXong] = useState<PhieuThu | null>(null);

  const daDat = useRef(false);
  useEffect(() => { if (ch && !daDat.current) { daDat.current = true; setHinhThuc(ch.hinhThuc[0] || 'Tiền mặt'); } }, [ch]);

  // Đơn còn nợ (không tính đơn hủy), cũ trước để thu dần
  const donNo = useMemo(() => (hs?.don ?? []).filter(d => d.TrangThai !== 'Hủy' && d.TongCong > d.daThu).reverse(), [hs]);
  const conDon = soDH ? (donNo.find(d => d.SoDH === soDH) ?? null) : null;
  const goiY = conDon ? conDon.TongCong - conDon.daThu : Math.max(0, hs?.no ?? 0);
  const tienThu = soTien ?? goiY;

  const luu = async () => {
    setLoi('');
    if (tienThu <= 0) return setLoi('Nhập số tiền thu.');
    setDang(true);
    try {
      if (!maGhi.current) maGhi.current = taoMaGhi();
      const pt = await goiGhi<PhieuThu>(maGhi.current, 'luuThuTien', { Ngay: homNay(), MaKH: ma, SoDH: soDH, SoTien: tienThu, HinhThuc: hinhThuc, GhiChu: ghiChu.trim() });
      maGhi.current = '';
      ghiThuThem(pt.SoDH, pt.SoTien);
      setXong(pt);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Máy chủ đã ghi: công nợ trên hồ sơ, Tổng quan, danh sách khách đổi ngay
      boNho.mot<HoSoKhach>('chiTietKhach', [ma], h => hoSoSauThu(h, pt));
      boNho.mot<TongQuan>('tongQuanMay', [], tq => tongQuanSauThu(tq, pt));
      boNho.mot<KhachNo>('chiTietTongQuan', ['no'], kn => khachNoSauThu(kn, pt));
      boNho.moi<DsKhach>('dsKhachMay', ds => dsKhachDoiNo(ds, pt.MaKH, -pt.SoTien));
    } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };

  if (xong) {
    return (
      <KhungTrang coTab={false}>
        <DauTrang tieuDe="Đã thu tiền" />
        <View style={{ alignItems: 'center', marginBottom: 10 }}><Ionicons name="checkmark-circle" size={64} color={mau.xanh} /></View>
        <The style={{ marginBottom: 14 }} testID="phieu-thu-xong">
          <DongTT nhan="Phiếu thu" giaTri={xong.SoPT} dam />
          <DongTT nhan="Khách" giaTri={xong.TenKH} />
          <DongTT nhan="Số tiền" giaTri={tien(xong.SoTien)} dam />
          <DongTT nhan="Hình thức" giaTri={xong.HinhThuc} />
          {xong.SoDH ? <DongTT nhan="Đơn hàng" giaTri={xong.SoDH} /> : null}
        </The>
        <Nut chu="Xong" bieuTuong="checkmark" onPress={() => router.back()} testID="nut-xong-thu" />
      </KhungTrang>
    );
  }

  return (
    <KhungTrang coTab={false}>
      <DauTrang tieuDe="Thu tiền" phu={hs ? `${hs.kh.TenKH} · còn nợ ${tien(Math.max(0, hs.no))}` : undefined} />
      <ChuLoi chu={!hs ? loi || dlHs.loi : ''} />
      {!hs && !loi && !dlHs.loi ? <KhungCho dong={3} /> : null}
      {hs ? (
        <>
          <The nhan="Thu cho đơn" style={s.muc}>
            <View style={s.chips}>
              <Chip chu="Thu chung" chon={!soDH} onPress={() => { setSoDH(''); setSoTien(null); }} testID="don-chung" />
              {donNo.map(d => <Chip key={d.SoDH} chu={`${d.SoDH} · ${tien(d.TongCong - d.daThu)}`} chon={soDH === d.SoDH} onPress={() => { setSoDH(d.SoDH); setSoTien(null); }} testID={'don-' + d.SoDH} />)}
            </View>
            {conDon ? <ChuNhat chu={`Đơn ngày ${ngay(conDon.Ngay)}: tổng ${tien(conDon.TongCong)}, đã thu ${tien(conDon.daThu)}.`} /> : null}
          </The>
          <The nhan="Số tiền" style={s.muc}>
            <TextInput style={s.o} value={soTienNhap(tienThu)} onChangeText={t => setSoTien(docTien(t))} keyboardType="number-pad" placeholder="0" placeholderTextColor={mau.xam} testID="o-so-tien" />
            <View style={s.chips}>
              {(ch?.hinhThuc ?? ['Tiền mặt', 'Chuyển khoản']).map(h => <Chip key={h} chu={h} chon={hinhThuc === h} onPress={() => setHinhThuc(h)} testID={'tt-ht-' + boDau(h).replace(/\s+/g, '-')} />)}
            </View>
            {/chuyen khoan/.test(boDau(hinhThuc)) ? <MaQR qr={ch?.qr ?? null} soTien={tienThu} noiDung={soDH || hs.kh.TenKH} /> : null}
            <TextInput style={[s.o, { marginTop: 12, fontSize: 16, fontWeight: '400' }]} value={ghiChu} onChangeText={setGhiChu} placeholder="Ghi chú (không bắt buộc)" placeholderTextColor={mau.xam} />
          </The>
          <ChuLoi chu={loi} testID="loi-thu" />
          <Nut chu={`Lưu phiếu thu · ${tien(tienThu)}`} bieuTuong="wallet" onPress={luu} dangChay={dang} style={{ marginTop: 12 }} testID="nut-luu-thu" />
          <Text style={s.ghiChu}>Phiếu thu ghi ngày hôm nay, lưu thẳng lên Google Sheet.</Text>
        </>
      ) : null}
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, fontWeight: '800', color: mau.chu, marginBottom: 12 },
  ghiChu: { fontSize: 13, color: mau.chuNhat, marginTop: 10, textAlign: 'center' },
});
