// Khách hàng: tìm theo tên (không cần dấu) / số điện thoại, lọc còn nợ / đã mua / chưa mua, sắp xếp; bấm vào khách để xem hồ sơ; thêm khách mới.
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import type { DsKhach } from '../../lib/api';
import { ngay, tien } from '../../lib/dinhDang';
import { useDuLieu } from '../../lib/useDuLieu';
import { LOC_KHACH, SX_KHACH, moTaSx, nhanCua, sxMacDinh, type LocKhach, type SxKhach } from '../../lib/locDs';
import { BoLoc, BoSapXep } from '../../ui/BoLoc';
import { ChuLoi, ChuNhat, Dong, KhungDanhSach, OTim } from '../../ui/DanhSach';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { DongCapNhat, KhungCho, useKeo } from '../../ui/TrangThaiTai';
import { mau } from '../../ui/theme';

export default function KhachMan() {
  const [q, setQ] = useState(''), [tu, setTu] = useState(''), [moi, setMoi] = useState(false);
  const [loc, setLoc] = useState<LocKhach>('tat'), [sx, setSx] = useState<SxKhach>(sxMacDinh(SX_KHACH));
  useEffect(() => { const t = setTimeout(() => setTu(q.trim()), q ? 350 : 0); return () => clearTimeout(t); }, [q]); // gõ xong mới tìm
  // Danh sách không tìm theo chữ thì lưu trên máy (mở lại hiện ngay); kết quả tìm chỉ nhớ trong lần chạy này. Đang tìm thì vẫn hiện kết quả cũ.
  const dl = useDuLieu<DsKhach>('dsKhachMay', [tu, { loc, sx: sx.theo, chieu: sx.chieu }], { luuMay: !tu, giuCu: true }), kq = dl.du, keo = useKeo(dl.lamMoi);

  return (
    <KhungDanhSach refreshControl={<RefreshControl {...keo} />} testID="ds-khach"
      dau={
        <View style={{ marginBottom: 14 }}>
          <View style={s.dau}>
            <Text style={s.tieuDe}>Khách hàng</Text>
            <Pressable onPress={() => setMoi(!moi)} style={s.nutThem} accessibilityRole="button" accessibilityLabel="Thêm khách mới" testID="nut-them-khach">
              <Ionicons name={moi ? 'close' : 'person-add'} size={20} color="#fff" />
            </Pressable>
          </View>
          <DongCapNhat dl={dl} />
          {moi ? <KhachMoi onXong={ma => { setMoi(false); router.push({ pathname: '/khach/[ma]', params: { ma } }); }} /> : null}
          <OTim value={q} onChangeText={setQ} placeholder="Tên, số điện thoại hoặc mã khách" testID="o-tim-khach" />
          <BoLoc ds={LOC_KHACH} chon={loc} onChon={setLoc} testID="loc-khach" />
          <BoSapXep ds={SX_KHACH} chon={sx} onChon={setSx} testID="sx-khach" />
          {!kq ? <ChuLoi chu={dl.loi} testID="loi-khach" /> : null}
        </View>
      }
      ds={kq ? kq.ds : null} khoa={k => k.MaKH} choTai={dl.loi ? null : <KhungCho dong={6} />}
      rong={tu ? `Không có khách nào khớp "${tu}"${loc !== 'tat' ? ' trong mục ' + nhanCua(LOC_KHACH, loc).toLowerCase() : ''}.`
        : loc !== 'tat' ? `Không có khách nào ${nhanCua(LOC_KHACH, loc).toLowerCase()}.` : 'Chưa có khách hàng.'}
      ve={k => (
        <Dong chinh={k.TenKH} phu={[k.SDT, k.muaCuoi && 'mua ' + ngay(k.muaCuoi)].filter(Boolean).join(' · ') || k.MaKH}
          ben={k.no > 0 ? tien(k.no) : undefined} benMau={mau.vang} benPhu={k.no > 0 ? 'còn nợ' : undefined}
          onPress={() => router.push({ pathname: '/khach/[ma]', params: { ma: k.MaKH } })} testID={'khach-' + k.MaKH} />
      )}
      cuoi={kq && kq.tong > kq.ds.length ? <ChuNhat chu={`Hiện ${kq.ds.length} / ${kq.tong} khách (${moTaSx(SX_KHACH, sx)}). Gõ tên hoặc số điện thoại để tìm.`} /> : null}
    />
  );
}

function KhachMoi({ onXong }: { onXong: (maKH: string) => void }) {
  const { goi } = useAuth();
  const [ten, setTen] = useState(''), [sdt, setSdt] = useState(''), [dc, setDc] = useState(''), [loi, setLoi] = useState(''), [dang, setDang] = useState(false);
  const luu = async () => {
    setLoi('');
    if (!ten.trim()) return setLoi('Nhập tên khách.');
    setDang(true);
    try { const kh = await goi<{ MaKH: string }>('luuKhach', { TenKH: ten.trim(), SDT: sdt.trim(), DiaChi: dc.trim() }); onXong(kh.MaKH); }
    catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  return (
    <The nhan="Khách mới" style={{ marginBottom: 14 }} testID="form-khach-moi">
      <TextInput style={s.o} value={ten} onChangeText={setTen} placeholder="Tên khách *" placeholderTextColor={mau.xam} testID="o-ten-khach" />
      <TextInput style={s.o} value={sdt} onChangeText={setSdt} placeholder="Số điện thoại" placeholderTextColor={mau.xam} keyboardType="phone-pad" testID="o-sdt-khach" />
      <TextInput style={s.o} value={dc} onChangeText={setDc} placeholder="Địa chỉ" placeholderTextColor={mau.xam} />
      <ChuLoi chu={loi} />
      <Nut chu="Lưu khách" bieuTuong="checkmark" onPress={luu} dangChay={dang} style={{ marginTop: 12 }} testID="nut-luu-khach" />
    </The>
  );
}

const s = StyleSheet.create({
  dau: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 14 },
  tieuDe: { flex: 1, fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5 },
  nutThem: { width: 46, height: 46, borderRadius: 23, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
  o: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: mau.chu, marginTop: 10 },
});
