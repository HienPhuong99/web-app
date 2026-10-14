// Sổ quỹ: tiền mặt tại quầy và tiền trong ngân hàng cuối ngày, thu – chi trong ngày (lật ngày trước / sau), từng phiếu thu / chi.
// Ghi phiếu chi ngay trên máy: trả nhà cung cấp, ship, điện nước… (sửa / xóa phiếu chi làm trên web, chỉ quản trị).
import { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { PhieuChi, SoQuy } from '../lib/api';
import { ngay as dmy, thu, tien, tienGon } from '../lib/dinhDang';
import { docTien, soTienNhap } from '../lib/gioHang';
import { timKiem } from '../lib/timKiem';
import { useDuLieu, useSuaBoNho } from '../lib/useDuLieu';
import { Chip } from '../ui/Chip';
import { ChuLoi, ChuNhat, Dong, KhungTrang, TieuDeMuc, Vach } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { DongCapNhat, KhungCho, useKeo } from '../ui/TrangThaiTai';
import { mau } from '../ui/theme';

export default function SoQuyMan() {
  const [ngay, setNgay] = useState('');
  const dl = useDuLieu<SoQuy>('soQuyMay', [ngay]), du = dl.du, keo = useKeo(dl.lamMoi);
  const [moChi, setMoChi] = useState(false);
  const dangXem = du && (!ngay || du.ngay === ngay) ? du : null; // vừa lật ngày: chưa hiện số của ngày cũ
  const ngayHien = ngay || du?.ngay || '';
  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl {...keo} />}>
      <DauTrang tieuDe="Sổ quỹ" phu="Tiền mặt tại quầy, tiền trong ngân hàng và các phiếu thu – chi." />
      <DongCapNhat dl={dl} />
      <View style={s.lat}>
        <NutLat bieuTuong="chevron-back" chu="Ngày trước" an={!du} onPress={() => du && setNgay(du.truoc)} testID="quy-truoc" />
        <Text style={s.latChu} testID="quy-ngay">{ngayHien ? `${thu(ngayHien)} · ${dmy(ngayHien)}` : '…'}</Text>
        <NutLat bieuTuong="chevron-forward" chu="Ngày sau" an={!du?.sau} onPress={() => du?.sau && setNgay(du.sau === du.homNay ? '' : du.sau)} testID="quy-sau" />
      </View>
      {!du ? <ChuLoi chu={dl.loi} testID="loi-so-quy" /> : null}
      {!dangXem && !dl.loi ? <KhungCho dong={3} /> : null}
      {dangXem ? (
        <>
          <The style={s.muc} testID="ton-quy">
            <View style={s.bo2}>
              <O nhan="Tiền mặt" so={tien(dangXem.ton.tienMat)} mauSo={dangXem.ton.tienMat < 0 ? mau.do : mau.chu} bieuTuong="cash-outline" />
              <O nhan="Ngân hàng" so={tien(dangXem.ton.nganHang)} mauSo={dangXem.ton.nganHang < 0 ? mau.do : mau.chu} bieuTuong="card-outline" />
            </View>
            <View style={[s.bo2, { marginTop: 12 }]}>
              <O nhan="Thu trong ngày" so={'+' + tienGon(dangXem.trongNgay.thu)} mauSo={mau.xanh} />
              <O nhan="Chi trong ngày" so={'−' + tienGon(dangXem.trongNgay.chi)} mauSo={mau.camDam} />
            </View>
            <Text style={s.ghiChu}>{dangXem.ngay === dangXem.homNay ? 'Số tiền đang có' : 'Số tiền cuối ngày ' + dmy(dangXem.ngay)}{dangXem.batDau ? `, tính từ ${dmy(dangXem.batDau)}` : ''}. Thu chi bằng tiền mặt vào quỹ tiền mặt, hình thức khác vào ngân hàng.</Text>
          </The>
          {moChi ? <PhieuChiMoi sq={dangXem} onXong={() => { setMoChi(false); dl.tai(); }} onHuy={() => setMoChi(false)} />
            : <Nut chu="Ghi phiếu chi" bieuTuong="remove-circle-outline" onPress={() => setMoChi(true)} style={s.muc} testID="nut-ghi-chi" />}
          <TieuDeMuc chu={`Phiếu thu – chi (${dangXem.ds.length})`} />
          <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-quy">
            {!dangXem.ds.length ? <ChuNhat chu="Không có phiếu thu, chi nào trong ngày." style={{ marginVertical: 10 }} /> : null}
            {dangXem.ds.map((p, i) => (
              <View key={p.loai + p.so}>
                {i ? <Vach /> : null}
                <Dong chinh={p.noiDung || (p.loai === 'thu' ? 'Thu tiền' : 'Chi tiền')} phu={[p.so, p.HinhThuc, p.luc.slice(11, 16)].filter(Boolean).join(' · ')}
                  ben={(p.loai === 'thu' ? '+' : '−') + tien(p.SoTien)} benMau={p.loai === 'thu' ? mau.xanh : mau.camDam}
                  bieuTuong={p.loai === 'thu' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} mauBT={p.loai === 'thu' ? mau.xanh : mau.camDam}
                  onPress={p.MaKH ? () => router.push({ pathname: '/khach/[ma]', params: { ma: p.MaKH } }) : undefined} testID={'quy-' + p.so} />
              </View>
            ))}
          </The>
        </>
      ) : null}
    </KhungTrang>
  );
}

function PhieuChiMoi({ sq, onXong, onHuy }: { sq: SoQuy; onXong: () => void; onHuy: () => void }) {
  const { goi } = useAuth();
  const boNho = useSuaBoNho();
  const [loai, setLoai] = useState(sq.loaiChi[sq.loaiChi.length - 1] || 'Chi khác'), [soTien, setSoTien] = useState<number | null>(null);
  const [hinhThuc, setHinhThuc] = useState(sq.hinhThuc.includes('Tiền mặt') ? 'Tiền mặt' : sq.hinhThuc[0] || 'Tiền mặt');
  const [doiTac, setDoiTac] = useState(''), [ghiChu, setGhiChu] = useState(''), [loi, setLoi] = useState(''), [dang, setDang] = useState(false), [imei, setImei] = useState('');
  // Gợi ý tên nhà cung cấp đã dùng theo chữ đang gõ (tìm kiếm thông minh: không dấu, viết tắt, gõ sai một chữ)
  const [goiY, setGoiY] = useState(false);
  const nccKhop = useMemo(() => (doiTac.trim() ? timKiem(sq.ncc ?? [], doiTac, x => x).filter(x => x !== doiTac.trim()).slice(0, 5) : []), [sq.ncc, doiTac]);
  const traNCC = loai === sq.loaiChi[0], lamLai = loai === 'Làm lại máy cũ'; // làm lại máy: ghi IMEI, tiền chi vào giá vốn máy đó
  const luu = async () => {
    setLoi('');
    if (!soTien || soTien <= 0) return setLoi('Nhập số tiền chi.');
    if (traNCC && !doiTac.trim()) return setLoi('Nhập tên nhà cung cấp được trả tiền.');
    if (lamLai && !imei.trim()) return setLoi('Nhập IMEI của máy được làm lại.');
    setDang(true);
    try {
      const pc = await goi<PhieuChi>('luuPhieuChi', { Ngay: sq.ngay, Loai: loai, DoiTac: doiTac.trim(), SoTien: soTien, HinhThuc: hinhThuc, GhiChu: ghiChu.trim(), IMEI: lamLai ? imei.trim() : '' });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Máy chủ đã ghi: sổ quỹ ngày này hiện ngay phiếu vừa ghi
      const tm = pc.HinhThuc.trim().toLowerCase() === 'tiền mặt';
      boNho.mot<SoQuy>('soQuyMay', [sq.ngay === sq.homNay ? '' : sq.ngay], q => ({
        ...q, ton: { tienMat: q.ton.tienMat - (tm ? pc.SoTien : 0), nganHang: q.ton.nganHang - (tm ? 0 : pc.SoTien) },
        trongNgay: { ...q.trongNgay, chi: q.trongNgay.chi + pc.SoTien },
        ds: [{ loai: 'chi', so: pc.SoPC, noiDung: [pc.Loai, pc.DoiTac, pc.GhiChu].filter(Boolean).join(' · '), SoTien: pc.SoTien, HinhThuc: pc.HinhThuc, MaKH: '', luc: '' }, ...q.ds],
      }));
      onXong();
    } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  return (
    <The nhan="Phiếu chi mới" mauNhan={mau.camDam} style={s.muc} testID="form-chi">
      <Text style={s.nhanO}>Loại chi</Text>
      <View style={s.chips}>{sq.loaiChi.map(x => <Chip key={x} chu={x} chon={x === loai} onPress={() => setLoai(x)} testID={'loai-chi-' + x} />)}</View>
      <Text style={s.nhanO}>Số tiền</Text>
      <TextInput style={s.o} value={soTien ? soTienNhap(soTien) : ''} onChangeText={t => setSoTien(docTien(t))} keyboardType="number-pad" placeholder="0" placeholderTextColor={mau.xam} testID="o-tien-chi" />
      <Text style={s.nhanO}>Hình thức</Text>
      <View style={s.chips}>{sq.hinhThuc.map(x => <Chip key={x} chu={x} chon={x === hinhThuc} onPress={() => setHinhThuc(x)} />)}</View>
      {lamLai ? <TextInput style={s.o} value={imei} onChangeText={setImei} placeholder="IMEI máy làm lại * (máy đang trong kho)" placeholderTextColor={mau.xam} autoCapitalize="characters" autoCorrect={false} testID="o-imei-chi" /> : null}
      <TextInput style={s.o} value={doiTac} onChangeText={t => { setDoiTac(t); setGoiY(true); }} onBlur={() => setTimeout(() => setGoiY(false), 200)}
        placeholder={traNCC ? 'Tên nhà cung cấp *' : 'Chi cho ai (không bắt buộc)'} placeholderTextColor={mau.xam} testID="o-doi-tac-chi" />
      {goiY && nccKhop.length ? (
        <View style={s.chips} testID="goi-y-ncc">{nccKhop.map(x => <Chip key={x} chu={x} chon={false} onPress={() => { setDoiTac(x); setGoiY(false); }} testID={'ncc-' + x} />)}</View>
      ) : null}
      <TextInput style={s.o} value={ghiChu} onChangeText={setGhiChu} placeholder="Ghi chú, vd: ship giao máy cho anh Minh" placeholderTextColor={mau.xam} />
      <ChuLoi chu={loi} testID="loi-chi" />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Nut chu="Hủy" phu onPress={onHuy} style={{ flex: 1 }} />
        <Nut chu="Lưu phiếu chi" bieuTuong="checkmark" onPress={luu} dangChay={dang} style={{ flex: 2 }} testID="nut-luu-chi" />
      </View>
    </The>
  );
}

function NutLat({ bieuTuong, chu, an, onPress, testID }: { bieuTuong: keyof typeof Ionicons.glyphMap; chu: string; an: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable onPress={onPress} disabled={an} style={[s.nutLat, an && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={chu} testID={testID} hitSlop={6}>
      <Ionicons name={bieuTuong} size={22} color={mau.chu} />
    </Pressable>
  );
}

function O({ nhan, so, mauSo, bieuTuong }: { nhan: string; so: string; mauSo: string; bieuTuong?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.o2}>
      {bieuTuong ? <Ionicons name={bieuTuong} size={20} color={mau.brand} /> : null}
      <Text style={[s.so, { color: mauSo }]} numberOfLines={1} adjustsFontSizeToFit>{so}</Text>
      <Text style={s.soNhan}>{nhan}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  lat: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  latChu: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: mau.chu },
  nutLat: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: mau.vach, alignItems: 'center', justifyContent: 'center' },
  bo2: { flexDirection: 'row', gap: 10 },
  o2: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  so: { fontSize: 20, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  soNhan: { fontSize: 13, color: mau.chuNhat, marginTop: 2, fontWeight: '600' },
  ghiChu: { fontSize: 13, color: mau.chuNhat, marginTop: 14, lineHeight: 19 },
  nhanO: { fontSize: 13, fontWeight: '700', color: mau.chuPhu, marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: mau.chu, marginTop: 10 },
});
