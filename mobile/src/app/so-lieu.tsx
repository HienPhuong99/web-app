// Chi tiết số liệu trên Tổng quan: bán hàng một ngày (đơn hàng, phiếu thu; lật sang ngày trước / sau) hoặc mọi khách còn nợ.
// Bấm một dòng để mở hồ sơ khách.
import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { ChiTietNgay, KhachNo } from '../lib/api';
import { ngay as dmy, thu, tien, tienGon } from '../lib/dinhDang';
import { ChuLoi, ChuNhat, Dong, KhungTrang, Nhan, TieuDeMuc, Vach } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { The } from '../ui/The';
import { mau } from '../ui/theme';

const MAU_DON: Record<string, 'xanh' | 'vang' | 'xam'> = { 'Đã giao': 'xanh', 'Giao một phần': 'vang', 'Chờ giao': 'vang', 'Hủy': 'xam' };
const moKhach = (ma: string) => { if (ma) router.push({ pathname: '/khach/[ma]', params: { ma } }); };

export default function SoLieuMan() {
  const p = useLocalSearchParams<{ loai?: string; ngay?: string }>();
  return p.loai === 'no' ? <KhachConNo /> : <BanTrongNgay ngayDau={p.ngay ?? ''} />;
}

function BanTrongNgay({ ngayDau }: { ngayDau: string }) {
  const { goi } = useAuth();
  const [ngay, setNgay] = useState(ngayDau), [du, setDu] = useState<ChiTietNgay | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const tai = useCallback(async () => {
    setDangTai(true);
    try { setDu(await goi<ChiTietNgay>('chiTietTongQuan', 'ngay', ngay)); setLoi(''); } catch (e) { setLoi((e as Error).message); } finally { setDangTai(false); }
  }, [goi, ngay]);
  useFocusEffect(useCallback(() => { tai(); }, [tai])); // đổi ngày: tải lại

  const dangXem = du && (!ngay || du.ngay === ngay) ? du : null; // vừa lật ngày: chưa hiện số của ngày cũ
  const ngayHien = ngay || du?.ngay || '';
  const tieuDe = !dangXem ? 'Bán hàng' : dangXem.ngay === dangXem.homNay ? 'Bán hàng hôm nay' : `Bán hàng ${thu(dangXem.ngay)} ${dmy(dangXem.ngay)}`;
  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl refreshing={dangTai && !!dangXem} onRefresh={tai} tintColor={mau.cam} />}>
      <DauTrang tieuDe={tieuDe} phu="Đơn hàng và tiền thu trong ngày. Bấm một dòng để mở hồ sơ khách." />
      <View style={s.lat}>
        <NutLat bieuTuong="chevron-back" chu="Ngày trước" an={!du} onPress={() => du && setNgay(du.truoc)} testID="ngay-truoc" />
        <Text style={s.latChu} testID="ngay-dang-xem">{ngayHien ? `${thu(ngayHien)} · ${dmy(ngayHien)}` : '…'}</Text>
        <NutLat bieuTuong="chevron-forward" chu="Ngày sau" an={!du || !du.sau} onPress={() => du?.sau && setNgay(du.sau)} testID="ngay-sau" />
      </View>
      <ChuLoi chu={loi} testID="loi-so-lieu" />
      {!dangXem && !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {dangXem ? (
        <>
          <The style={s.muc} testID="tong-ngay">
            <View style={s.bo3}>
              <O3 so={tienGon(dangXem.tong.tien)} nhan="Doanh số" mauSo={mau.chu} />
              <O3 so={String(dangXem.tong.don)} nhan={dangXem.tong.huy ? `Đơn (${dangXem.tong.huy} hủy)` : 'Đơn hàng'} mauSo={mau.brand} />
              <O3 so={tienGon(dangXem.tong.thu)} nhan="Đã thu" mauSo={mau.xanh} />
            </View>
          </The>
          <TieuDeMuc chu={`Đơn hàng (${dangXem.don.length})`} />
          <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-don-ngay">
            {!dangXem.don.length ? <ChuNhat chu="Không có đơn hàng nào trong ngày." style={{ marginVertical: 10 }} /> : null}
            {dangXem.don.map((d, i) => (
              <View key={d.SoDH}>
                {i ? <Vach /> : null}
                <Pressable onPress={() => moKhach(d.MaKH)} disabled={!d.MaKH} style={({ pressed }) => [s.dong, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={d.TenKH} testID={'don-' + d.SoDH}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chinh} numberOfLines={1}>{d.TenKH || 'Khách lẻ'}</Text>
                    <Text style={s.phu}>{[d.SoDH, d.gio].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[s.tien, d.TrangThai === 'Hủy' && { color: mau.xam, textDecorationLine: 'line-through' }]}>{tien(d.TongCong)}</Text>
                    {d.TrangThai !== 'Hủy' && d.TongCong > d.daThu ? <Text style={s.no}>còn {tien(d.TongCong - d.daThu)}</Text> : <Nhan chu={d.TrangThai} loai={MAU_DON[d.TrangThai] ?? 'xam'} />}
                  </View>
                </Pressable>
              </View>
            ))}
          </The>
          <TieuDeMuc chu={`Phiếu thu (${dangXem.thu.length})`} />
          <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-thu-ngay">
            {!dangXem.thu.length ? <ChuNhat chu="Không thu tiền nào trong ngày." style={{ marginVertical: 10 }} /> : null}
            {dangXem.thu.map((p, i) => (
              <View key={p.SoPT}>
                {i ? <Vach /> : null}
                <Dong chinh={tien(p.SoTien)} phu={[p.TenKH, p.HinhThuc, p.SoDH && 'đơn ' + p.SoDH].filter(Boolean).join(' · ')} ben={p.SoPT}
                  onPress={p.MaKH ? () => moKhach(p.MaKH) : undefined} bieuTuong="wallet-outline" mauBT={mau.xanh} />
              </View>
            ))}
          </The>
        </>
      ) : null}
    </KhungTrang>
  );
}

function KhachConNo() {
  const { goi } = useAuth();
  const [du, setDu] = useState<KhachNo | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const tai = useCallback(async () => {
    setDangTai(true);
    try { setDu(await goi<KhachNo>('chiTietTongQuan', 'no')); setLoi(''); } catch (e) { setLoi((e as Error).message); } finally { setDangTai(false); }
  }, [goi]);
  useFocusEffect(useCallback(() => { tai(); }, [tai])); // thu tiền xong quay lại: số mới
  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl refreshing={dangTai && !!du} onRefresh={tai} tintColor={mau.cam} />}>
      <DauTrang tieuDe="Khách còn nợ" phu={du ? `${du.ds.length} khách · tổng ${tien(du.tong)}` : 'Nợ nhiều nhất trước. Bấm để mở hồ sơ và thu tiền.'} />
      <ChuLoi chu={loi} testID="loi-so-lieu" />
      {!du && !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {du ? (
        <The style={{ paddingVertical: 6 }} testID="ds-khach-no">
          {!du.ds.length ? <ChuNhat chu="Không có khách nào còn nợ." style={{ marginVertical: 10 }} /> : null}
          {du.ds.map((k, i) => (
            <View key={k.MaKH || k.TenKH}>
              {i ? <Vach /> : null}
              <View style={s.dong}>
                <Pressable style={{ flex: 1 }} onPress={() => moKhach(k.MaKH)} disabled={!k.MaKH} accessibilityRole="button" accessibilityLabel={k.TenKH} testID={'no-' + k.MaKH}>
                  <Text style={s.chinh} numberOfLines={1}>{k.TenKH}</Text>
                  <Text style={[s.phu, { color: mau.vang, fontWeight: '700' }]}>{tien(k.tien)}</Text>
                </Pressable>
                {k.SDT ? (
                  <Pressable onPress={() => Linking.openURL('tel:' + String(k.SDT).replace(/[^\d+]/g, ''))} style={s.goi} accessibilityLabel={'Gọi ' + k.TenKH}>
                    <Ionicons name="call" size={18} color={mau.brand} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </The>
      ) : null}
    </KhungTrang>
  );
}

function NutLat({ bieuTuong, chu, an, onPress, testID }: { bieuTuong: keyof typeof Ionicons.glyphMap; chu: string; an: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable onPress={onPress} disabled={an} style={[s.nutLat, an && { opacity: 0.3 }]} accessibilityRole="button" accessibilityLabel={chu} testID={testID} hitSlop={6}>
      <Ionicons name={bieuTuong} size={22} color={mau.chu} />
    </Pressable>
  );
}

function O3({ so, nhan, mauSo }: { so: string; nhan: string; mauSo: string }) {
  return (
    <View style={s.o3}>
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
  bo3: { flexDirection: 'row' },
  o3: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  so: { fontSize: 18, fontWeight: '800' },
  soNhan: { fontSize: 13, color: mau.chuNhat, marginTop: 2, fontWeight: '600' },
  dong: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 2 },
  tien: { fontSize: 15, fontWeight: '800', color: mau.chu },
  no: { fontSize: 13, fontWeight: '700', color: mau.vang },
  goi: { width: 40, height: 40, borderRadius: 20, backgroundColor: mau.brandNhat, alignItems: 'center', justifyContent: 'center' },
});
