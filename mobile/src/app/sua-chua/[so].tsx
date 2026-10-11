// Một phiếu bảo hành – sửa chữa. so = 'moi': nhận máy mới (có thể điền sẵn khách / máy / IMEI từ tra bảo hành, hồ sơ khách).
// Phiếu đã có: gọi khách, đổi trạng thái, ghi kết quả / chi phí, thêm ảnh, trả máy cho khách (có phí thì máy chủ lập đơn dịch vụ).
import { useState } from 'react';
import { Linking, Platform, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../lib/auth';
import { TT_SUA, type CauHinh, type PhieuSua } from '../../lib/api';
import { homNay, ngay, tien } from '../../lib/dinhDang';
import { docTien, soTienNhap } from '../../lib/gioHang';
import { linkGoi, linkZalo, soDienThoai } from '../../lib/lienHe';
import { luu } from '../../lib/boNho';
import { useDuLieu, useKhoaBoNho } from '../../lib/useDuLieu';
import { Chip } from '../../ui/Chip';
import { ChuLoi, DongTT, KhungTrang } from '../../ui/DanhSach';
import { DauTrang } from '../../ui/DauTrang';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { DongCapNhat, KhungCho, useKeo } from '../../ui/TrangThaiTai';
import { mau } from '../../ui/theme';
import { MAU_SUA, maDuongDan, moTaHen, tuDuongDan } from '../../lib/phieuSua';

const congNgay = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return homNay(d); };
const rung = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };

export default function PhieuSuaMan() {
  const p = useLocalSearchParams<{ so: string; ma?: string; ten?: string; sdt?: string; may?: string; imei?: string; loai?: string }>();
  return p.so === 'moi' ? <NhanMay goiY={p} /> : <ChiTiet so={tuDuongDan(p.so)} />;
}

function NhanMay({ goiY }: { goiY: { ma?: string; ten?: string; sdt?: string; may?: string; imei?: string; loai?: string } }) {
  const { goi } = useAuth();
  const taoKhoa = useKhoaBoNho();
  const [loai, setLoai] = useState(goiY.loai === 'Bảo hành' ? 'Bảo hành' : 'Sửa chữa');
  const [maKH, setMaKH] = useState(goiY.ma ?? ''), [tenKH, setTenKH] = useState(goiY.ten ?? ''), [sdt, setSdt] = useState(goiY.sdt ?? '');
  const [tenMay, setTenMay] = useState(goiY.may ?? ''), [imei, setImei] = useState(goiY.imei ?? ''), [tinhTrang, setTinhTrang] = useState('');
  const [phuKien, setPhuKien] = useState(''), [matKhau, setMatKhau] = useState(''), [hen, setHen] = useState(congNgay(3)), [chiPhi, setChiPhi] = useState(0);
  const [loi, setLoi] = useState(''), [dang, setDang] = useState(false);
  const luuPhieu = async () => {
    setLoi('');
    if (!maKH && !tenKH.trim()) return setLoi('Nhập tên khách.');
    if (!tenMay.trim() && !imei.trim()) return setLoi('Nhập tên máy hoặc IMEI.');
    if (!tinhTrang.trim()) return setLoi('Nhập tình trạng, lỗi khách báo.');
    setDang(true);
    try {
      const kq = await goi<PhieuSua>('luuSuaChua', {
        Loai: loai, ...(maKH ? { MaKH: maKH } : { khachMoi: { TenKH: tenKH.trim(), SDT: sdt.trim() } }),
        TenMay: tenMay.trim(), IMEI: imei.trim(), TinhTrang: tinhTrang.trim(), PhuKien: phuKien.trim(), MatKhauMay: matKhau.trim(), NgayHen: hen, ChiPhi: chiPhi,
      });
      rung();
      luu(taoKhoa('chiTietSuaChua', kq.SoPN), kq); // mở chi tiết là có ngay
      router.replace({ pathname: '/sua-chua/[so]', params: { so: maDuongDan(kq.SoPN) } });
    } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  return (
    <KhungTrang coTab={false}>
      <DauTrang tieuDe="Nhận máy" phu="Ghi lỗi khách báo, phụ kiện kèm, mật khẩu máy và ngày hẹn trả." />
      <The nhan="Loại" style={s.muc}>
        <View style={s.chips}>{['Sửa chữa', 'Bảo hành'].map(x => <Chip key={x} chu={x} chon={x === loai} onPress={() => setLoai(x)} testID={'loai-sua-' + (x === 'Bảo hành' ? 'bh' : 'sc')} />)}</View>
      </The>
      <The nhan="Khách" style={s.muc}>
        {maKH ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[s.chinh, { flex: 1 }]}>{tenKH}{sdt ? ' · ' + sdt : ''}</Text>
            <Chip chu="Đổi" chon={false} onPress={() => { setMaKH(''); setTenKH(''); setSdt(''); }} />
          </View>
        ) : (
          <>
            <TextInput style={s.o} value={tenKH} onChangeText={setTenKH} placeholder="Tên khách *" placeholderTextColor={mau.xam} testID="o-ten-khach-sua" />
            <TextInput style={s.o} value={sdt} onChangeText={setSdt} placeholder="Số điện thoại (trùng số khách cũ thì dùng khách cũ)" placeholderTextColor={mau.xam} keyboardType="phone-pad" testID="o-sdt-sua" />
          </>
        )}
      </The>
      <The nhan="Máy" style={s.muc}>
        <TextInput style={s.o} value={tenMay} onChangeText={setTenMay} placeholder="Tên máy, vd: iPhone 14 Pro 128GB" placeholderTextColor={mau.xam} testID="o-may-sua" />
        <TextInput style={s.o} value={imei} onChangeText={setImei} placeholder="IMEI / serial" placeholderTextColor={mau.xam} autoCapitalize="characters" autoCorrect={false} testID="o-imei-sua" />
        <TextInput style={[s.o, { minHeight: 70 }]} value={tinhTrang} onChangeText={setTinhTrang} placeholder="Tình trạng, lỗi khách báo *" placeholderTextColor={mau.xam} multiline testID="o-tinh-trang" />
        <TextInput style={s.o} value={phuKien} onChangeText={setPhuKien} placeholder="Phụ kiện kèm theo (ốp, sim, hộp…)" placeholderTextColor={mau.xam} />
        <TextInput style={s.o} value={matKhau} onChangeText={setMatKhau} placeholder="Mật khẩu màn hình (nếu cần để kiểm tra)" placeholderTextColor={mau.xam} autoCapitalize="none" autoCorrect={false} />
      </The>
      <The nhan="Hẹn trả, chi phí" style={s.muc}>
        <View style={s.chips}>
          {[[0, 'Hôm nay'], [1, 'Mai'], [3, '3 ngày'], [7, '1 tuần']].map(([n, t]) => <Chip key={n} chu={String(t)} chon={hen === congNgay(+n)} onPress={() => setHen(congNgay(+n))} testID={'hen-' + n} />)}
        </View>
        <Text style={s.phu}>Hẹn trả: {ngay(hen)}</Text>
        <TextInput style={s.o} value={chiPhi ? soTienNhap(chiPhi) : ''} onChangeText={t => setChiPhi(docTien(t))} keyboardType="number-pad" placeholder="Chi phí dự kiến (bảo hành để trống)" placeholderTextColor={mau.xam} testID="o-chi-phi" />
      </The>
      <ChuLoi chu={loi} testID="loi-nhan-may" />
      <Nut chu="Nhận máy" bieuTuong="checkmark-circle" onPress={luuPhieu} dangChay={dang} style={{ marginTop: 12 }} testID="nut-luu-nhan-may" />
    </KhungTrang>
  );
}

function ChiTiet({ so }: { so: string }) {
  const { goi } = useAuth();
  const taoKhoa = useKhoaBoNho();
  const dl = useDuLieu<PhieuSua>('chiTietSuaChua', [so]), p = dl.du, keo = useKeo(dl.lamMoi);
  const ch = useDuLieu<CauHinh>('cauHinhMay', []).du;
  const [loi, setLoi] = useState(''), [dang, setDang] = useState(''), [moTra, setMoTra] = useState(false);
  const [ketQua, setKetQua] = useState<string | null>(null), [chiPhi, setChiPhi] = useState<number | null>(null), [khachTra, setKhachTra] = useState<number | null>(null), [ht, setHt] = useState('');
  const capNhat = (kq: PhieuSua) => luu(taoKhoa('chiTietSuaChua', so), kq);
  const chay = async (viec: string, fn: () => Promise<void>) => {
    setLoi(''); setDang(viec);
    try { await fn(); } catch (e) { setLoi((e as Error).message); } finally { setDang(''); }
  };
  const doiTT = (tt: string) => chay('tt', async () => { capNhat(await goi<PhieuSua>('luuSuaChua', { SoPN: so, TrangThai: tt })); rung(); });
  const luuKQ = () => chay('kq', async () => {
    capNhat(await goi<PhieuSua>('luuSuaChua', { SoPN: so, KetQua: ketQua ?? p?.KetQua, ChiPhi: chiPhi ?? p?.ChiPhi }));
    setKetQua(null); setChiPhi(null); rung();
  });
  const themAnh = (camera: boolean) => chay('anh', async () => {
    if (camera) { const q = await ImagePicker.requestCameraPermissionsAsync(); if (!q.granted) throw new Error('Cần cho phép dùng camera để chụp ảnh máy.'); }
    const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.4, base64: true };
    const r = camera ? await ImagePicker.launchCameraAsync(o) : await ImagePicker.launchImageLibraryAsync(o);
    const b64 = !r.canceled ? r.assets?.[0]?.base64 : null;
    if (!b64) return;
    capNhat(await goi<PhieuSua>('luuAnhSuaChua', so, b64)); rung();
  });
  const cp = chiPhi ?? p?.ChiPhi ?? 0, tra = khachTra ?? cp, hinhThuc = ht || ch?.hinhThuc[0] || 'Tiền mặt';
  const traMay = () => chay('tra', async () => {
    const kq = await goi<PhieuSua & { don: { SoDH: string } | null }>('traMaySua', so, { ChiPhi: cp, KetQua: ketQua ?? p?.KetQua, thu: { SoTien: tra, HinhThuc: hinhThuc } });
    capNhat(kq); setMoTra(false); rung();
  });
  const sdt = soDienThoai(p?.SDT), daTra = p?.TrangThai === 'Đã trả khách';
  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl {...keo} />}>
      <DauTrang tieuDe={p ? `${p.TenMay || p.IMEI}` : so} phu={p ? `${p.Loai} · ${p.SoPN} · nhận ${ngay(p.NgayNhan)}` : undefined} />
      <DongCapNhat dl={dl} />
      {!p ? <ChuLoi chu={dl.loi} /> : null}
      {!p && !dl.loi ? <KhungCho dong={4} /> : null}
      {p ? (
        <>
          <The nhan={p.TrangThai} mauNhan={MAU_SUA[p.TrangThai] ?? mau.brand} style={s.muc} testID="the-phieu-sua">
            <DongTT nhan="Khách" giaTri={p.TenKH} onPress={p.MaKH ? () => router.push({ pathname: '/khach/[ma]', params: { ma: p.MaKH } }) : undefined} />
            {p.SDT ? <DongTT nhan="Điện thoại" giaTri={p.SDT} /> : null}
            {p.IMEI ? <DongTT nhan="IMEI / serial" giaTri={p.IMEI} dam /> : null}
            <DongTT nhan="Tình trạng" giaTri={p.TinhTrang} />
            {p.PhuKien ? <DongTT nhan="Phụ kiện kèm" giaTri={p.PhuKien} /> : null}
            {p.MatKhauMay ? <DongTT nhan="Mật khẩu máy" giaTri={p.MatKhauMay} /> : null}
            <DongTT nhan={daTra ? 'Đã trả' : 'Hẹn trả'} giaTri={daTra ? p.NgayTra : [p.NgayHen ? ngay(p.NgayHen) : '—', p.conNgay !== null && p.conNgay > 0 ? `còn ${p.conNgay} ngày` : moTaHen(p)].filter(Boolean).join(' · ')} />
            {p.ChiPhi ? <DongTT nhan="Chi phí" giaTri={tien(p.ChiPhi)} dam /> : null}
            {p.SoDH ? <DongTT nhan="Đơn dịch vụ" giaTri={p.SoDH} /> : null}
            {p.Anh.length ? <DongTT nhan="Ảnh" giaTri={`${p.Anh.length} ảnh (xem trên web)`} /> : null}
            {sdt ? (
              <View style={[s.chips, { marginTop: 12 }]}>
                <Nut chu="Gọi" phu bieuTuong="call" onPress={() => Linking.openURL(linkGoi(sdt))} style={{ flex: 1, minHeight: 44 }} />
                <Nut chu="Zalo" phu bieuTuong="chatbubble-ellipses" onPress={() => Linking.openURL(linkZalo(sdt))} style={{ flex: 1, minHeight: 44 }} />
              </View>
            ) : null}
          </The>

          {!daTra ? (
            <>
              <The nhan="Trạng thái" style={s.muc}>
                <View style={s.chips}>
                  {TT_SUA.filter(t => t !== 'Đã trả khách').map(t => <Chip key={t} chu={t} chon={p.TrangThai === t} onPress={() => { if (t !== p.TrangThai && !dang) doiTT(t); }} testID={'tt-sua-' + TT_SUA.indexOf(t)} />)}
                </View>
              </The>
              <The nhan="Kết quả, chi phí" style={s.muc}>
                <TextInput style={s.o} value={ketQua ?? p.KetQua} onChangeText={setKetQua} placeholder="Kết quả xử lý, vd: thay pin" placeholderTextColor={mau.xam} testID="o-ket-qua" />
                <TextInput style={s.o} value={cp ? soTienNhap(cp) : ''} onChangeText={t => setChiPhi(docTien(t))} keyboardType="number-pad" placeholder="Chi phí" placeholderTextColor={mau.xam} testID="o-chi-phi-ct" />
                {ketQua !== null || chiPhi !== null ? <Nut chu="Lưu" phu bieuTuong="save-outline" onPress={luuKQ} dangChay={dang === 'kq'} style={{ marginTop: 10, minHeight: 46 }} testID="nut-luu-kq" /> : null}
              </The>
              <View style={[s.chips, s.muc]}>
                {Platform.OS !== 'web' ? <Nut chu="Chụp ảnh" phu bieuTuong="camera-outline" onPress={() => themAnh(true)} dangChay={dang === 'anh'} style={{ flex: 1, minHeight: 46 }} /> : null}
                <Nut chu="Chọn ảnh" phu bieuTuong="image-outline" onPress={() => themAnh(false)} dangChay={dang === 'anh'} style={{ flex: 1, minHeight: 46 }} />
              </View>
              {moTra ? (
                <The nhan="Trả máy cho khách" mauNhan={mau.xanh} style={s.muc} testID="form-tra-may">
                  <Text style={s.phu}>Chi phí {tien(cp)}{cp ? '. App lập đơn dịch vụ để tính doanh thu, công nợ.' : ' (bảo hành miễn phí).'}</Text>
                  {cp ? (
                    <>
                      <TextInput style={s.o} value={soTienNhap(tra)} onChangeText={t => setKhachTra(docTien(t))} keyboardType="number-pad" placeholder="Khách trả" placeholderTextColor={mau.xam} testID="o-khach-tra-sua" />
                      <View style={[s.chips, { marginTop: 10 }]}>{(ch?.hinhThuc ?? ['Tiền mặt']).map(h => <Chip key={h} chu={h} chon={h === hinhThuc} onPress={() => setHt(h)} />)}</View>
                      {tra < cp ? <Text style={[s.phu, { color: mau.vang }]}>Khách còn nợ {tien(cp - tra)}</Text> : null}
                    </>
                  ) : null}
                  <View style={[s.chips, { marginTop: 12 }]}>
                    <Nut chu="Hủy" phu onPress={() => setMoTra(false)} style={{ flex: 1 }} />
                    <Nut chu="Xác nhận trả máy" bieuTuong="checkmark" onPress={traMay} dangChay={dang === 'tra'} style={{ flex: 2 }} testID="nut-xac-nhan-tra" />
                  </View>
                </The>
              ) : <Nut chu="Trả máy cho khách" bieuTuong="checkmark-done-outline" onPress={() => setMoTra(true)} style={s.muc} testID="nut-tra-may" />}
            </>
          ) : p.KetQua ? <The nhan="Kết quả" style={s.muc}><Text style={s.chinh}>{p.KetQua}</Text></The> : null}
          <ChuLoi chu={loi} testID="loi-phieu-sua" />
        </>
      ) : null}
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 10, lineHeight: 20 },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: mau.chu, marginTop: 10 },
});
