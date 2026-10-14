// Sổ quỹ: tiền mặt tại quầy và tiền trong ngân hàng cuối ngày, thu – chi trong ngày (lật ngày trước / sau), từng phiếu thu / chi.
// Ghi phiếu chi ngay trên máy: trả nhà cung cấp, ship, điện nước… (sửa / xóa phiếu chi làm trên web, chỉ quản trị).
// Hình thức chờ giải ngân (trả góp, thẻ… cài trên web): quỹ riêng; tiền về tài khoản thì bấm "Ghi nhận tiền về" (trừ phí).
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { PhieuChi, SoQuy } from '../lib/api';
import { taoMaGhi } from '../lib/ghiMotLan';
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
  const [moChi, setMoChi] = useState(false), [moGN, setMoGN] = useState(false);
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
            {dangXem.choGiaiNgan?.length ? (
              <View style={{ marginTop: 12 }} testID="quy-cho">
                <O nhan="Chờ giải ngân" so={tien(dangXem.ton.cho ?? 0)} mauSo={mau.chu} bieuTuong="hourglass-outline" />
                <Text style={[s.ghiChu, { marginTop: 4, textAlign: 'center' }]}>{dangXem.choGiaiNgan.map(x => `${x.HinhThuc} ${tien(x.con)}`).join(' · ')}</Text>
              </View>
            ) : null}
            <View style={[s.bo2, { marginTop: 12 }]}>
              <O nhan="Thu trong ngày" so={'+' + tienGon(dangXem.trongNgay.thu)} mauSo={mau.xanh} />
              <O nhan="Chi trong ngày" so={'−' + tienGon(dangXem.trongNgay.chi)} mauSo={mau.camDam} />
            </View>
            <Text style={s.ghiChu}>{dangXem.ngay === dangXem.homNay ? 'Số tiền đang có' : 'Số tiền cuối ngày ' + dmy(dangXem.ngay)}{dangXem.batDau ? `, tính từ ${dmy(dangXem.batDau)}` : ''}. Thu chi bằng tiền mặt vào quỹ tiền mặt{dangXem.choGiaiNgan?.length ? `, ${dangXem.choGiaiNgan.map(x => x.HinhThuc).join(', ')} vào quỹ chờ giải ngân` : ''}, hình thức khác vào ngân hàng.</Text>
          </The>
          {moChi ? <PhieuChiMoi sq={dangXem} onXong={() => { setMoChi(false); dl.tai(); }} onHuy={() => setMoChi(false)} />
            : <Nut chu="Ghi phiếu chi" bieuTuong="remove-circle-outline" onPress={() => setMoChi(true)} style={s.muc} testID="nut-ghi-chi" />}
          {moGN ? <GiaiNganMoi sq={dangXem} onXong={() => { setMoGN(false); dl.tai(); }} onHuy={() => setMoGN(false)} />
            : dangXem.ngay === dangXem.homNay && dangXem.choGiaiNgan?.some(x => x.con > 0)
              ? <Nut chu="Ghi nhận tiền về (giải ngân)" phu bieuTuong="download-outline" onPress={() => setMoGN(true)} style={s.muc} testID="nut-giai-ngan" /> : null}
          <TieuDeMuc chu={`Phiếu thu – chi (${dangXem.ds.length})`} />
          <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-quy">
            {!dangXem.ds.length ? <ChuNhat chu="Không có phiếu thu, chi nào trong ngày." style={{ marginVertical: 10 }} /> : null}
            {dangXem.ds.map((p, i) => (
              <View key={p.loai + p.so}>
                {i ? <Vach /> : null}
                <Dong chinh={p.noiDung || (p.loai === 'thu' ? 'Thu tiền' : 'Chi tiền')} phu={[p.so, p.HinhThuc, p.luc.slice(11, 16)].filter(Boolean).join(' · ')}
                  ben={p.loai === 'giaiNgan' ? '⇄ ' + tien(p.SoTien) : (p.loai === 'thu' ? '+' : '−') + tien(p.SoTien)} benMau={p.loai === 'chi' ? mau.camDam : p.loai === 'thu' ? mau.xanh : mau.brand}
                  bieuTuong={p.loai === 'giaiNgan' ? 'swap-horizontal-outline' : p.loai === 'thu' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} mauBT={p.loai === 'chi' ? mau.camDam : p.loai === 'thu' ? mau.xanh : mau.brand}
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
  const { goiGhi } = useAuth();
  const maGhi = useRef(''); // mã lần gửi: bấm lại sau lỗi mạng không ghi phiếu chi thứ hai
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
      if (!maGhi.current) maGhi.current = taoMaGhi();
      const pc = await goiGhi<PhieuChi>(maGhi.current, 'luuPhieuChi', { Ngay: sq.ngay, Loai: loai, DoiTac: doiTac.trim(), SoTien: soTien, HinhThuc: hinhThuc, GhiChu: ghiChu.trim(), IMEI: lamLai ? imei.trim() : '' });
      maGhi.current = '';
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Máy chủ đã ghi: sổ quỹ ngày này hiện ngay phiếu vừa ghi (trừ đúng quỹ của hình thức chi)
      const ht = pc.HinhThuc.trim(), quy = ht.toLowerCase() === 'tiền mặt' ? 'tienMat' : (sq.choGiaiNgan ?? []).some(x => x.HinhThuc === ht) ? 'cho' : 'nganHang';
      boNho.mot<SoQuy>('soQuyMay', [sq.ngay === sq.homNay ? '' : sq.ngay], q => ({
        ...q, ton: { ...q.ton, [quy]: (q.ton[quy] ?? 0) - pc.SoTien },
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

/** Ghi nhận tiền chờ giải ngân đã về tài khoản: số rời quỹ chờ (mặc định cả số đang chờ), thực nhận (mặc định trừ % phí đã cài) */
function GiaiNganMoi({ sq, onXong, onHuy }: { sq: SoQuy; onXong: () => void; onHuy: () => void }) {
  const { goiGhi } = useAuth();
  const maGhi = useRef('');
  const ds = (sq.choGiaiNgan ?? []).filter(x => x.con > 0);
  const [ht, setHt] = useState(ds[0]?.HinhThuc ?? ''), [soTien, setSoTien] = useState<number | null>(null), [thucNhan, setThucNhan] = useState<number | null>(null);
  const [ghiChu, setGhiChu] = useState(''), [loi, setLoi] = useState(''), [dang, setDang] = useState(false);
  const x = ds.find(y => y.HinhThuc === ht), so = soTien ?? x?.con ?? 0, nhan = thucNhan ?? Math.round(so * (100 - (x?.Phi ?? 0)) / 100);
  const luu = async () => {
    setLoi('');
    if (!x) return setLoi('Chọn hình thức.');
    if (so <= 0) return setLoi('Nhập số tiền giải ngân.');
    if (so > x.con) return setLoi(`${ht} chỉ đang chờ ${tien(x.con)}.`);
    if (nhan > so) return setLoi('Số thực nhận không lớn hơn số giải ngân.');
    setDang(true);
    try {
      if (!maGhi.current) maGhi.current = taoMaGhi();
      await goiGhi(maGhi.current, 'luuGiaiNgan', { HinhThuc: ht, SoTien: so, ThucNhan: nhan, GhiChu: ghiChu.trim() });
      maGhi.current = '';
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onXong();
    } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  return (
    <The nhan="Ghi nhận tiền về" mauNhan={mau.brand} style={s.muc} testID="form-giai-ngan">
      <View style={s.chips}>{ds.map(y => <Chip key={y.HinhThuc} chu={`${y.HinhThuc} · ${tienGon(y.con)}`} chon={y.HinhThuc === ht} onPress={() => { setHt(y.HinhThuc); setSoTien(null); setThucNhan(null); }} testID={'gn-' + y.HinhThuc} />)}</View>
      <Text style={s.nhanO}>Số tiền giải ngân (rời quỹ chờ)</Text>
      <TextInput style={s.o} value={soTienNhap(so)} onChangeText={t => { setSoTien(docTien(t)); setThucNhan(null); }} keyboardType="number-pad" testID="o-tien-gn" />
      <Text style={s.nhanO}>Thực nhận vào tài khoản{x?.Phi ? ` (đã trừ phí ${x.Phi}%)` : ''}</Text>
      <TextInput style={s.o} value={soTienNhap(nhan)} onChangeText={t => setThucNhan(docTien(t))} keyboardType="number-pad" testID="o-thuc-nhan" />
      {so > nhan ? <Text style={s.ghiChu}>Phí {tien(so - nhan)} tính vào chi hôm nay.</Text> : null}
      <TextInput style={s.o} value={ghiChu} onChangeText={setGhiChu} placeholder="Ghi chú, vd: HD Saison chuyển" placeholderTextColor={mau.xam} />
      <ChuLoi chu={loi} testID="loi-gn" />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Nut chu="Hủy" phu onPress={onHuy} style={{ flex: 1 }} />
        <Nut chu="Lưu" bieuTuong="checkmark" onPress={luu} dangChay={dang} style={{ flex: 2 }} testID="nut-luu-gn" />
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
