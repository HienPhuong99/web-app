// Tổng quan: doanh số hôm nay (vòng lớn), đơn / đã thu / còn nợ, 7 ngày gần nhất và việc cần làm (cùng cách tính với email sáng).
import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import type { TongQuan } from '../../lib/api';
import { loiChao, ngay, tien, tienGon } from '../../lib/dinhDang';
import { BieuDo7Ngay } from '../../ui/BieuDo7Ngay';
import { Nen } from '../../ui/Nen';
import { The } from '../../ui/The';
import { VongSo } from '../../ui/VongSo';
import { DEM_DUOI, mau } from '../../ui/theme';

const TOI_DA = 3; // số dòng mỗi nhóm việc; còn lại ghi "và N mục khác"

export default function TongQuanMan() {
  const { goi, user, tenCuaHang } = useAuth();
  const [du, setDu] = useState<TongQuan | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);

  const tai = useCallback(async () => {
    setDangTai(true);
    try { setDu(await goi<TongQuan>('tongQuanMay')); setLoi(''); } catch (e) { setLoi((e as Error).message); } finally { setDangTai(false); }
  }, [goi]);
  useFocusEffect(useCallback(() => { tai(); }, [tai])); // mỗi lần mở tab lấy số mới

  const max7 = du ? Math.max(...du.ban7.map(x => x.tien), 1) : 1;
  const ten = du?.user.ten ?? user?.ten ?? '';
  return (
    <View style={{ flex: 1 }}>
      <Nen />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.khung} refreshControl={<RefreshControl refreshing={dangTai && !!du} onRefresh={tai} tintColor={mau.cam} />}>
          <View style={s.dau}>
            <View style={{ flex: 1 }}>
              <Text style={s.chao}>{loiChao(new Date().getHours())},</Text>
              <Text style={s.ten} numberOfLines={1} testID="ten-nguoi-dung">{ten}</Text>
              <Text style={s.cuaHang}>{du?.cuaHang.ten ?? tenCuaHang}{du ? ' · ' + ngay(du.homNay) : ''}</Text>
            </View>
            <View style={s.anh}><Text style={s.anhChu}>{(ten || '?').trim().charAt(0).toUpperCase()}</Text></View>
          </View>

          <View style={s.phimTat}>
            <PhimTat bieuTuong="bag-add" chu="Bán nhanh" mauBT={mau.camDam} onPress={() => router.navigate('/ban')} testID="pt-ban" />
            <PhimTat bieuTuong="people" chu="Khách" mauBT={mau.brand} onPress={() => router.navigate('/khach')} />
            <PhimTat bieuTuong="cube" chu="Kho" mauBT={mau.xanh} onPress={() => router.push('/kho')} testID="pt-kho" />
            <PhimTat bieuTuong="document-text" chu="Hợp đồng" mauBT={mau.vang} onPress={() => router.push('/hop-dong')} />
          </View>

          {loi ? (
            <The nhan="Không tải được" mauNhan={mau.do} style={s.muc} testID="loi-tong-quan">
              <Text style={s.chuThuong}>{loi}</Text>
              <Pressable onPress={tai} style={{ marginTop: 10 }}><Text style={s.lienKet}>Thử lại</Text></Pressable>
            </The>
          ) : null}

          {!du && !loi ? <The style={s.muc}><Text style={s.chuNhat}>Đang tải số liệu…</Text></The> : null}

          {du ? (
            <>
              <The style={[s.muc, { alignItems: 'center' }]} testID="the-doanh-so">
                <Text style={s.nhanGiua}>DOANH SỐ HÔM NAY</Text>
                <VongSo tiLe={du.ban.tien / max7} giua={tienGon(du.ban.tien)} duoi={du.ban.tien >= max7 && du.ban.tien > 0 ? 'Cao nhất 7 ngày' : `${du.ban.don} đơn hàng`} />
                <View style={s.bo3}>
                  <So bieuTuong="receipt-outline" mauBT={mau.brand} so={String(du.ban.don)} nhan="Đơn hôm nay" />
                  <So bieuTuong="wallet-outline" mauBT={mau.xanh} so={tienGon(du.thu)} nhan="Đã thu" />
                  <So bieuTuong="time-outline" mauBT={mau.vang} so={tienGon(du.no.tong)} nhan="Khách còn nợ" />
                </View>
              </The>

              <The tieuDe="7 ngày gần nhất" style={s.muc}>
                <BieuDo7Ngay ds={du.ban7} />
                <Text style={s.chuNhat}>Hôm qua: {du.homQua.don} đơn · {tien(du.homQua.tien)}</Text>
              </The>

              <Text style={s.tieuDeMuc}>Cần làm{du.soMuc ? ` (${du.soMuc})` : ''}</Text>
              {!du.soMuc ? (
                <The nhan="Ổn cả" mauNhan={mau.xanh} tieuDe="Chưa có việc cần chú ý" style={s.muc} testID="khong-co-viec">
                  <Text style={s.chuThuong}>Không có hợp đồng sắp hết hạn, đợt thu đến hạn, đơn trễ giao hay hàng sắp hết.</Text>
                </The>
              ) : null}
              <NhomViec nhan="Trả góp · cần thu" mauNhan={mau.cam} bieuTuong="calendar-outline" ds={du.dot.map(x => ({
                k: x.SoHD + x.Nhan, chinh: x.TenDN, phu: `${x.Nhan} · ${tien(x.SoTien)}`,
                ben: x.quaHan ? `Quá ${-x.n} ngày` : x.n === 0 ? 'Hôm nay' : `Còn ${x.n} ngày`, gap: x.quaHan,
              }))} />
              <NhomViec nhan="Hợp đồng" mauNhan={mau.brand} bieuTuong="document-text-outline" ds={du.hopDong.map(x => ({
                k: x.SoHD, chinh: x.TenDN, phu: `${x.SoHD} · hết hạn ${ngay(x.NgayHetHan)}${x.tuGiaHan ? ' · tự gia hạn' : ''}`,
                ben: x.het ? `Quá ${x.n} ngày` : x.n === 0 ? 'Hôm nay' : `Còn ${x.n} ngày`, gap: x.het || (x.bao > 0 && x.quyetDinh < 0),
              }))} />
              <NhomViec nhan="Đơn trễ giao" mauNhan={mau.vang} bieuTuong="cube-outline" ds={du.donTre.map(x => ({
                k: x.SoDH, chinh: x.TenKH || 'Khách lẻ', phu: `${x.SoDH} · ${tien(x.TongCong)}`, ben: 'Hẹn ' + ngay(x.NgayGiao).slice(0, 5), gap: true,
              }))} />
              <NhomViec nhan="Hàng sắp hết" mauNhan={mau.do} bieuTuong="alert-circle-outline" ds={du.hang.map(x => ({
                k: x.MaHH, chinh: x.TenHang, phu: x.toiThieu ? `Tối thiểu ${x.toiThieu}` : '', ben: `Còn ${x.ton}`, gap: x.ton <= 0,
              }))} />

              {du.no.top.length ? (
                <The nhan="Công nợ" mauNhan={mau.vang} tieuDe={`${du.no.soKhach} khách còn nợ ${tien(du.no.tong)}`} style={s.muc}>
                  {du.no.top.slice(0, TOI_DA).map(k => (
                    <View key={k.MaKH || k.TenKH} style={s.dong}>
                      <Pressable style={{ flex: 1 }} disabled={!k.MaKH} onPress={() => router.push({ pathname: '/khach/[ma]', params: { ma: k.MaKH } })}
                        accessibilityRole="button" accessibilityLabel={'Hồ sơ ' + k.TenKH} testID={'no-' + k.MaKH}>
                        <Text style={s.dongChinh} numberOfLines={1}>{k.TenKH}</Text>
                        <Text style={s.dongPhu}>{tien(k.tien)}</Text>
                      </Pressable>
                      {k.SDT ? (
                        <Pressable onPress={() => Linking.openURL('tel:' + k.SDT.replace(/[^\d+]/g, ''))} style={s.goi} accessibilityLabel={'Gọi ' + k.TenKH}>
                          <Ionicons name="call" size={18} color={mau.brand} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </The>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PhimTat({ bieuTuong, chu, mauBT, onPress, testID }: { bieuTuong: keyof typeof Ionicons.glyphMap; chu: string; mauBT: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pt, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={chu} testID={testID}>
      <View style={[s.ptTron, { backgroundColor: mauBT + '1F' }]}><Ionicons name={bieuTuong} size={22} color={mauBT} /></View>
      <Text style={s.ptChu} numberOfLines={1}>{chu}</Text>
    </Pressable>
  );
}

function So({ bieuTuong, mauBT, so, nhan }: { bieuTuong: keyof typeof Ionicons.glyphMap; mauBT: string; so: string; nhan: string }) {
  return (
    <View style={s.o3}>
      <Ionicons name={bieuTuong} size={22} color={mauBT} />
      <Text style={s.so} numberOfLines={1} adjustsFontSizeToFit>{so}</Text>
      <Text style={s.soNhan}>{nhan}</Text>
    </View>
  );
}

type Viec = { k: string; chinh: string; phu: string; ben: string; gap: boolean };
function NhomViec({ nhan, mauNhan, bieuTuong, ds }: { nhan: string; mauNhan: string; bieuTuong: keyof typeof Ionicons.glyphMap; ds: Viec[] }) {
  if (!ds.length) return null;
  return (
    <The nhan={`${nhan} (${ds.length})`} mauNhan={mauNhan} style={s.muc} testID={'viec-' + nhan}>
      {ds.slice(0, TOI_DA).map(v => (
        <View key={v.k} style={s.dong}>
          <View style={[s.chamTron, { backgroundColor: mauNhan + '1F' }]}><Ionicons name={bieuTuong} size={18} color={mauNhan} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.dongChinh} numberOfLines={1}>{v.chinh}</Text>
            {v.phu ? <Text style={s.dongPhu} numberOfLines={1}>{v.phu}</Text> : null}
          </View>
          <Text style={[s.ben, v.gap && { color: mau.do }]}>{v.ben}</Text>
        </View>
      ))}
      {ds.length > TOI_DA ? <Text style={s.chuNhat}>… và {ds.length - TOI_DA} mục khác (xem trên web)</Text> : null}
    </The>
  );
}

const s = StyleSheet.create({
  khung: { padding: 18, paddingBottom: DEM_DUOI, maxWidth: 560, width: '100%', alignSelf: 'center' },
  dau: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 6 },
  chao: { fontSize: 16, color: mau.chuPhu, fontWeight: '600' },
  ten: { fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5 },
  cuaHang: { fontSize: 14, color: mau.chuNhat, marginTop: 2, fontWeight: '600' },
  anh: { width: 52, height: 52, borderRadius: 26, backgroundColor: mau.brand, alignItems: 'center', justifyContent: 'center' },
  anhChu: { color: '#fff', fontSize: 22, fontWeight: '800' },
  muc: { marginBottom: 14 },
  phimTat: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pt: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', minWidth: 0 },
  ptTron: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ptChu: { fontSize: 13, fontWeight: '700', color: mau.chu, marginTop: 6 },
  nhanGiua: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: mau.camDam },
  bo3: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 4 },
  o3: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  so: { fontSize: 20, fontWeight: '800', color: mau.chu, marginTop: 6 },
  soNhan: { fontSize: 13, color: mau.chuNhat, marginTop: 2, fontWeight: '600' },
  tieuDeMuc: { fontSize: 20, fontWeight: '800', color: mau.chu, marginTop: 8, marginBottom: 10, marginLeft: 4 },
  dong: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  chamTron: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dongChinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  dongPhu: { fontSize: 14, color: mau.chuNhat, marginTop: 1 },
  ben: { fontSize: 14, fontWeight: '700', color: mau.chuPhu },
  goi: { width: 40, height: 40, borderRadius: 20, backgroundColor: mau.brandNhat, alignItems: 'center', justifyContent: 'center' },
  chuThuong: { fontSize: 15, color: mau.chuPhu, lineHeight: 21 },
  chuNhat: { fontSize: 14, color: mau.chuNhat, marginTop: 8 },
  lienKet: { fontSize: 15, color: mau.camDam, fontWeight: '700' },
});
