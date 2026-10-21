// Thu mua máy cũ lẻ: khách bán đứt máy, không mua máy mới. Máy chủ lập phiếu nhập kho (giá nhập = giá thu) và phiếu chi trả người bán
// (API thuMuaMayCu). Bắt buộc số CCCD người bán và tích ô đã kiểm iCloud.
import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { CauHinh, MaKho } from '../lib/api';
import { ngay, tien } from '../lib/dinhDang';
import { docTien, soTienNhap } from '../lib/gioHang';
import { taoMaGhi } from '../lib/ghiMotLan';
import { boDau } from '../lib/lienHe';
import { chuanHoaMa } from '../lib/maQuet';
import { useDuLieu } from '../lib/useDuLieu';
import { Chip } from '../ui/Chip';
import { ChuLoi, ChuNhat, DongTT, KhungTrang } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { HangLayMa } from '../ui/KhungQuet';
import { Nut } from '../ui/Nut';
import { LOI_ICLOUD, OICloud } from '../ui/OICloud';
import { The } from '../ui/The';
import { mau } from '../ui/theme';

type KetQua = { TenHang: string; IMEI: string; GiaThu: number; GiaLe: number; SoPK: string; SoPC: string; HinhThuc: string; TenNguoiBan: string };

export default function ThuMuaMan() {
  const { goi, goiGhi } = useAuth();
  const ch = useDuLieu<CauHinh>('cauHinhMay', []).du;
  const maGhi = useRef(''); // mã lần gửi: thử lại sau lỗi mạng không lập phiếu thứ hai
  const [ten, setTen] = useState(''), [imei, setImei] = useState(''), [gia, setGia] = useState(0), [giaLe, setGiaLe] = useState(0), [tinhTrang, setTinhTrang] = useState('');
  const [nguoiBan, setNguoiBan] = useState(''), [cccd, setCccd] = useState(''), [sdt, setSdt] = useState(''), [hinhThuc, setHinhThuc] = useState('Tiền mặt'), [daKiem, setDaKiem] = useState(false);
  const [loi, setLoi] = useState(''), [lichSu, setLichSu] = useState(''), [dang, setDang] = useState(false), [xong, setXong] = useState<KetQua | null>(null), daTra = useRef('');
  const dsHT = (ch?.hinhThuc ?? ['Tiền mặt', 'Chuyển khoản']).filter(h => !(ch?.choGiaiNgan ?? []).includes(h)); // tiền chờ giải ngân không dùng để trả người bán

  // Gõ / quét xong IMEI: tra lịch sử. Máy cửa hàng từng bán thì tự điền tên máy; máy đang trong kho thì báo ngay (không thu được)
  const traLichSu = async (raw = imei) => {
    const ma = chuanHoaMa(raw);
    if (ma.length < 8 || ma === daTra.current) return;
    daTra.current = ma; setLichSu('');
    try {
      const r = await goi<MaKho>('traMaKho', ma);
      if (r.trangThai === 'trongKho') return setLoi(`Máy ${r.ma} đang trong kho (${r.TenHang}, phiếu ${r.SoPK}): kiểm tra lại IMEI.`);
      setLoi('');
      if (r.trangThai === 'daBan') {
        if (!ten.trim() && r.TenHang) setTen(r.TenHang);
        setLichSu(`Máy cửa hàng đã bán ngày ${ngay(r.Ngay)}${r.DoiTac ? ' cho ' + r.DoiTac : ''}${r.SoDH ? ' (đơn ' + r.SoDH + ')' : ''}: ${r.TenHang}.`);
      }
    } catch { /* mất mạng: vẫn thu được, máy chủ kiểm lại khi lưu */ }
  };

  const luu = async () => {
    setLoi('');
    if (!ten.trim()) return setLoi('Nhập tên máy cũ, vd: iPhone 12 64GB.');
    if (chuanHoaMa(imei).length < 4) return setLoi('Nhập IMEI/serial của máy.');
    if (gia <= 0) return setLoi('Nhập giá thu.');
    if (!nguoiBan.trim()) return setLoi('Nhập tên người bán máy.');
    if (!/^(\d{12}|\d{9})$/.test(cccd.replace(/\D/g, ''))) return setLoi('Nhập số CCCD của người bán (12 số).');
    if (!daKiem) return setLoi(LOI_ICLOUD);
    setDang(true);
    try {
      if (!maGhi.current) maGhi.current = taoMaGhi();
      const kq = await goiGhi<KetQua>(maGhi.current, 'thuMuaMayCu', { TenHang: ten.trim(), IMEI: chuanHoaMa(imei), GiaThu: gia, GiaLe: giaLe, GhiChu: tinhTrang.trim(),
        TenNguoiBan: nguoiBan.trim(), CCCD: cccd, SDT: sdt.trim(), HinhThuc: hinhThuc, daKiemICloud: daKiem });
      maGhi.current = '';
      setXong(kq);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  const lamTiep = () => {
    setXong(null); setTen(''); setImei(''); setGia(0); setGiaLe(0); setTinhTrang(''); setNguoiBan(''); setCccd(''); setSdt(''); setDaKiem(false); setLoi(''); setLichSu(''); daTra.current = '';
  };

  if (xong) {
    return (
      <KhungTrang coTab={false}>
        <DauTrang tieuDe="Đã thu mua máy" />
        <View style={{ alignItems: 'center', marginBottom: 10 }}><Ionicons name="checkmark-circle" size={64} color={mau.xanh} /></View>
        <The style={{ marginBottom: 14 }} testID="thu-mua-xong">
          <DongTT nhan="Máy" giaTri={xong.TenHang} dam />
          <DongTT nhan="IMEI" giaTri={xong.IMEI} />
          <DongTT nhan="Giá thu" giaTri={tien(xong.GiaThu)} dam />
          <DongTT nhan="Người bán" giaTri={xong.TenNguoiBan} />
          <DongTT nhan="Phiếu nhập kho" giaTri={xong.SoPK} />
          <DongTT nhan="Phiếu chi" giaTri={`${xong.SoPC} · ${xong.HinhThuc}`} />
        </The>
        <ChuNhat chu="In tem dán lưng máy trên web: mở phiếu nhập kho, bấm In tem máy." />
        <Nut chu="Thu mua máy khác" phu bieuTuong="add" onPress={lamTiep} style={{ marginTop: 12 }} testID="nut-thu-mua-tiep" />
        <Nut chu="Xong" bieuTuong="checkmark" onPress={() => router.back()} style={{ marginTop: 10 }} testID="nut-xong-thu-mua" />
      </KhungTrang>
    );
  }

  return (
    <KhungTrang coTab={false}>
      <DauTrang tieuDe="Thu mua máy cũ" phu="Khách bán đứt máy, không mua máy mới" />
      <The nhan="Máy" style={s.muc}>
        <TextInput style={s.o} value={imei} onChangeText={setImei} placeholder="IMEI / serial *" placeholderTextColor={mau.xam} autoCapitalize="characters" autoCorrect={false}
          onEndEditing={() => traLichSu()} onSubmitEditing={() => traLichSu()} testID="o-imei-thu-mua" />
        <HangLayMa onMa={m => { setImei(m); traLichSu(m); }} onLoi={setLoi} />
        {lichSu ? <Text style={s.phu} testID="lich-su-thu-mua">{lichSu}</Text> : null}
        <TextInput style={[s.o, { marginTop: 10 }]} value={ten} onChangeText={setTen} placeholder="Tên máy * (vd: iPhone 12 64GB)" placeholderTextColor={mau.xam} testID="o-ten-thu-mua" />
        <View style={s.hang}>
          <TextInput style={[s.o, { flex: 1 }]} value={soTienNhap(gia)} onChangeText={t => setGia(docTien(t))} keyboardType="number-pad" placeholder="Giá thu *" placeholderTextColor={mau.xam} testID="o-gia-thu-mua" />
          <TextInput style={[s.o, { flex: 1 }]} value={soTienNhap(giaLe)} onChangeText={t => setGiaLe(docTien(t))} keyboardType="number-pad" placeholder="Giá bán dự kiến" placeholderTextColor={mau.xam} testID="o-gia-le-thu-mua" />
        </View>
        <TextInput style={s.o} value={tinhTrang} onChangeText={setTinhTrang} placeholder="Tình trạng (vd: trầy nhẹ, pin 85%)" placeholderTextColor={mau.xam} testID="o-tinh-trang-thu-mua" />
      </The>
      <The nhan="Người bán" style={s.muc}>
        <TextInput style={s.o} value={nguoiBan} onChangeText={setNguoiBan} placeholder="Họ tên theo CCCD *" placeholderTextColor={mau.xam} testID="o-nguoi-ban" />
        <TextInput style={s.o} value={cccd} onChangeText={setCccd} keyboardType="number-pad" placeholder="Số CCCD * (12 số)" placeholderTextColor={mau.xam} maxLength={15} testID="o-cccd" />
        <TextInput style={s.o} value={sdt} onChangeText={setSdt} keyboardType="phone-pad" placeholder="Điện thoại" placeholderTextColor={mau.xam} testID="o-sdt-ban" />
        <Text style={s.nhan}>Trả tiền bằng</Text>
        <View style={s.chips}>
          {dsHT.map(h => <Chip key={h} chu={h} chon={hinhThuc === h} onPress={() => setHinhThuc(h)} testID={'tm-ht-' + boDau(h).replace(/\s+/g, '-')} />)}
        </View>
      </The>
      <OICloud chon={daKiem} onDoi={setDaKiem} />
      <ChuLoi chu={loi} testID="loi-thu-mua" />
      <Nut chu={`Thu mua · ${tien(gia)}`} bieuTuong="phone-portrait-outline" onPress={luu} dangChay={dang} style={{ marginTop: 12 }} testID="nut-luu-thu-mua" />
      <Text style={s.ghiChu}>Máy vào kho ngay (nhóm Máy cũ), lập luôn phiếu chi trả tiền người bán. Số CCCD lưu ở ghi chú phiếu nhập.</Text>
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  hang: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: mau.chu, marginBottom: 10 },
  nhan: { fontSize: 13, fontWeight: '700', color: mau.chuNhat, marginTop: 4 },
  phu: { fontSize: 13, color: mau.chuNhat, marginTop: 6 },
  ghiChu: { fontSize: 13, color: mau.chuNhat, marginTop: 10, textAlign: 'center' },
});
