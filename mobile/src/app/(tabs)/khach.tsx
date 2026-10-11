// Khách hàng: tìm theo tên (không cần dấu) / số điện thoại, lọc còn nợ / đã mua / chưa mua, sắp xếp; bấm vào khách để xem hồ sơ; thêm khách mới.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import type { DsKhach } from '../../lib/api';
import { ngay, tien } from '../../lib/dinhDang';
import { LOC_KHACH, SX_KHACH, moTaSx, nhanCua, sxMacDinh, type LocKhach, type SxKhach } from '../../lib/locDs';
import { BoLoc, BoSapXep } from '../../ui/BoLoc';
import { ChuLoi, ChuNhat, Dong, KhungTrang, OTim, Vach } from '../../ui/DanhSach';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { mau } from '../../ui/theme';

export default function KhachMan() {
  const { goi } = useAuth();
  const [q, setQ] = useState(''), [kq, setKq] = useState<DsKhach | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const [moi, setMoi] = useState(false), [loc, setLoc] = useState<LocKhach>('tat'), [sx, setSx] = useState<SxKhach>(sxMacDinh(SX_KHACH));
  const lan = useRef(0); // chỉ nhận kết quả của lần tìm mới nhất

  const tai = useCallback(async (tu: string) => {
    const so = ++lan.current;
    setDangTai(true);
    try { const r = await goi<DsKhach>('dsKhachMay', tu, { loc, sx: sx.theo, chieu: sx.chieu }); if (so === lan.current) { setKq(r); setLoi(''); } }
    catch (e) { if (so === lan.current) setLoi((e as Error).message); }
    finally { if (so === lan.current) setDangTai(false); }
  }, [goi, loc, sx]);

  useEffect(() => { const t = setTimeout(() => tai(q.trim()), q ? 350 : 0); return () => clearTimeout(t); }, [q, tai]);
  // Quay lại tab thì lấy công nợ mới (chỉ khi tab được mở lại; đổi lọc / sắp xếp đã có effect trên tải)
  const taiLai = useRef(() => {});
  useEffect(() => { taiLai.current = () => { if (kq) tai(q.trim()); }; });
  useFocusEffect(useCallback(() => { taiLai.current(); }, []));

  return (
    <KhungTrang refreshControl={<RefreshControl refreshing={dangTai && !!kq} onRefresh={() => tai(q.trim())} tintColor={mau.cam} />}>
      <View style={s.dau}>
        <Text style={s.tieuDe}>Khách hàng</Text>
        <Pressable onPress={() => setMoi(!moi)} style={s.nutThem} accessibilityRole="button" accessibilityLabel="Thêm khách mới" testID="nut-them-khach">
          <Ionicons name={moi ? 'close' : 'person-add'} size={20} color="#fff" />
        </Pressable>
      </View>
      {moi ? <KhachMoi onXong={ma => { setMoi(false); router.push({ pathname: '/khach/[ma]', params: { ma } }); }} /> : null}
      <OTim value={q} onChangeText={setQ} placeholder="Tên, số điện thoại hoặc mã khách" testID="o-tim-khach" />
      <BoLoc ds={LOC_KHACH} chon={loc} onChon={setLoc} testID="loc-khach" />
      <BoSapXep ds={SX_KHACH} chon={sx} onChon={setSx} testID="sx-khach" />
      <ChuLoi chu={loi} testID="loi-khach" />
      {kq ? (
        <The style={{ marginTop: 14, paddingVertical: 6 }} testID="ds-khach">
          {!kq.ds.length ? <ChuNhat chu={q ? `Không có khách nào khớp "${q.trim()}"${loc !== 'tat' ? ' trong mục ' + nhanCua(LOC_KHACH, loc).toLowerCase() : ''}.`
            : loc !== 'tat' ? `Không có khách nào ${nhanCua(LOC_KHACH, loc).toLowerCase()}.` : 'Chưa có khách hàng.'} style={{ marginVertical: 12 }} /> : null}
          {kq.ds.map((k, i) => (
            <View key={k.MaKH}>
              {i ? <Vach /> : null}
              <Dong chinh={k.TenKH} phu={[k.SDT, k.muaCuoi && 'mua ' + ngay(k.muaCuoi)].filter(Boolean).join(' · ') || k.MaKH}
                ben={k.no > 0 ? tien(k.no) : undefined} benMau={mau.vang} benPhu={k.no > 0 ? 'còn nợ' : undefined}
                onPress={() => router.push({ pathname: '/khach/[ma]', params: { ma: k.MaKH } })} testID={'khach-' + k.MaKH} />
            </View>
          ))}
        </The>
      ) : !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {kq && kq.tong > kq.ds.length ? <ChuNhat chu={`Hiện ${kq.ds.length} / ${kq.tong} khách (${moTaSx(SX_KHACH, sx)}). Gõ tên hoặc số điện thoại để tìm.`} /> : null}
    </KhungTrang>
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
