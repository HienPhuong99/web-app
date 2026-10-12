// Hồ sơ một khách: gọi / Zalo / nhắn tin, công nợ (thu tiền), bán tiếp, máy đã mua kèm bảo hành, đơn hàng (lọc còn nợ / chưa giao), phiếu thu, hợp đồng (chia sẻ PDF).
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { HoSoKhach } from '../../lib/api';
import { ngay, tien } from '../../lib/dinhDang';
import { linkGoi, linkZalo, soDienThoai } from '../../lib/lienHe';
import { LOC_DON, locDon, type LocDon } from '../../lib/locDs';
import { useGuiPhieu, useTaiPdf } from '../../lib/pdf';
import { hoi } from '../../ui/hoi';
import { useDuLieu } from '../../lib/useDuLieu';
import { BoLoc } from '../../ui/BoLoc';
import { ChuLoi, ChuNhat, Dong, DongTT, KhungTrang, Nhan, TieuDeMuc, Vach } from '../../ui/DanhSach';
import { DauTrang } from '../../ui/DauTrang';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { TheMay } from '../../ui/TheMay';
import { DongCapNhat, KhungCho, useKeo } from '../../ui/TrangThaiTai';
import { mau } from '../../ui/theme';

const MAU_DON: Record<string, 'xanh' | 'vang' | 'do' | 'xam'> = { 'Đã giao': 'xanh', 'Giao một phần': 'vang', 'Chờ giao': 'vang', 'Hủy': 'xam' };

export default function HoSoKhachMan() {
  const { ma } = useLocalSearchParams<{ ma: string }>();
  const dl = useDuLieu<HoSoKhach>('chiTietKhach', [ma]), hs = dl.du, keo = useKeo(dl.lamMoi); // thu tiền xong quay lại: công nợ đã sửa sẵn, máy chủ xác nhận ở nền
  const pdf = useTaiPdf(), phieu = useGuiPhieu();
  const guiPhieu = async (soDH: string) => { if (await hoi('Gửi phiếu bán hàng?', `Phiếu đơn ${soDH} (hàng, IMEI, hạn bảo hành) dạng PDF để gửi khách qua Zalo, Messenger…`, 'Gửi')) phieu.gui(soDH); };
  const [locD, setLocD] = useState<LocDon>('tat');

  const kh = hs?.kh, sdt = soDienThoai(kh?.SDT);
  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl {...keo} />}>
      <DauTrang tieuDe={kh?.TenKH ?? 'Khách hàng'} phu={kh ? [kh.MaKH, kh.SDT].filter(Boolean).join(' · ') : undefined} />
      <DongCapNhat dl={dl} />
      {!hs ? <ChuLoi chu={dl.loi} testID="loi-ho-so" /> : null}
      {!hs && !dl.loi ? <KhungCho dong={4} tron /> : null}
      {hs && kh ? (
        <>
          {sdt ? (
            <View style={s.hangNut}>
              <NutTron bieuTuong="call" chu="Gọi" onPress={() => Linking.openURL(linkGoi(sdt))} />
              <NutTron bieuTuong="chatbubble-ellipses" chu="Zalo" onPress={() => Linking.openURL(linkZalo(sdt))} testID="nut-zalo" />
              <NutTron bieuTuong="mail" chu="Tin nhắn" onPress={() => Linking.openURL('sms:' + sdt)} />
            </View>
          ) : null}

          <The nhan="Công nợ" mauNhan={hs.no > 0 ? mau.vang : mau.xanh} style={s.muc} testID="the-cong-no">
            <Text style={[s.soLon, { color: hs.no > 0 ? mau.vang : mau.xanh }]} testID="cong-no">{hs.no > 0 ? tien(hs.no) : 'Không còn nợ'}</Text>
            <Text style={s.chuPhu}>Đã mua {tien(hs.mua)} · đã trả {tien(hs.da)}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {hs.no > 0 ? <Nut chu="Thu tiền" bieuTuong="wallet" onPress={() => router.push({ pathname: '/thu-tien', params: { ma: kh.MaKH } })} style={{ flex: 1 }} testID="nut-thu-tien" /> : null}
              <Nut chu="Bán tiếp" phu={hs.no > 0} bieuTuong="bag-add" onPress={() => router.navigate({ pathname: '/ban', params: { ma: kh.MaKH, ten: kh.TenKH } })} style={{ flex: 1 }} testID="nut-ban-tiep" />
            </View>
          </The>

          {kh.DiaChi || kh.NguoiLienHe || kh.Email || kh.GhiChu ? (
            <The nhan="Thông tin" mauNhan={mau.brand} style={s.muc}>
              {kh.NguoiLienHe ? <DongTT nhan="Người liên hệ" giaTri={kh.NguoiLienHe} /> : null}
              {kh.DiaChi ? <DongTT nhan="Địa chỉ" giaTri={kh.DiaChi} /> : null}
              {kh.Email ? <DongTT nhan="Email" giaTri={kh.Email} onPress={() => Linking.openURL('mailto:' + kh.Email)} /> : null}
              {kh.GhiChu ? <DongTT nhan="Ghi chú" giaTri={kh.GhiChu} /> : null}
            </The>
          ) : null}

          {hs.may.length ? <TieuDeMuc chu={`Máy đã mua (${hs.may.length})`} /> : null}
          {hs.may.map(x => <TheMay key={x.SoPK + x.MaHH + x.IMEI} x={x} />)}

          <TieuDeMuc chu={`Đơn hàng (${hs.don.length})`} />
          {hs.don.length > 1 ? <View style={{ marginTop: -6, marginBottom: 10 }}><BoLoc ds={LOC_DON} chon={locD} onChon={setLocD} dem={v => locDon(hs.don, v).length} testID="loc-don" /></View> : null}
          <The style={[s.muc, { paddingVertical: 6 }]} testID="ds-don">
            {!hs.don.length ? <ChuNhat chu="Chưa có đơn hàng." style={{ marginVertical: 10 }} /> : null}
            {hs.don.length > 0 && !locDon(hs.don, locD).length ? <ChuNhat chu="Không có đơn nào phù hợp." style={{ marginVertical: 10 }} /> : null}
            {locDon(hs.don, locD).map((d, i) => (
              <View key={d.SoDH}>
                {i ? <Vach /> : null}
                <Pressable onPress={() => guiPhieu(d.SoDH)} style={({ pressed }) => [s.dongDon, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={'Gửi phiếu đơn ' + d.SoDH} testID={'don-' + d.SoDH}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chinh}>{d.SoDH}{phieu.dang === d.SoDH ? ' · đang tạo phiếu…' : ''}</Text>
                    <Text style={s.chuPhu}>{ngay(d.Ngay)}{d.TrangThai !== 'Hủy' && d.TongCong > d.daThu ? ` · còn ${tien(d.TongCong - d.daThu)}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.tien}>{tien(d.TongCong)}</Text>
                    <Nhan chu={d.TrangThai} loai={MAU_DON[d.TrangThai] ?? 'xam'} />
                  </View>
                  <Ionicons name="share-outline" size={18} color={mau.xam} />
                </Pressable>
              </View>
            ))}
            <ChuLoi chu={phieu.loi} />
          </The>

          {hs.thu.length ? (
            <>
              <TieuDeMuc chu={`Đã thu (${hs.thu.length})`} />
              <The style={[s.muc, { paddingVertical: 6 }]}>
                {hs.thu.map((p, i) => (
                  <View key={p.SoPT}>
                    {i ? <Vach /> : null}
                    <Dong chinh={tien(p.SoTien)} phu={[ngay(p.Ngay), p.HinhThuc, p.SoDH && 'đơn ' + p.SoDH].filter(Boolean).join(' · ')} ben={p.SoPT} />
                  </View>
                ))}
              </The>
            </>
          ) : null}

          {hs.hopDong.length ? (
            <>
              <TieuDeMuc chu={`Hợp đồng (${hs.hopDong.length})`} />
              <The style={[s.muc, { paddingVertical: 6 }]}>
                {hs.hopDong.map((h, i) => (
                  <View key={h.SoHD}>
                    {i ? <Vach /> : null}
                    <Dong chinh={h.SoHD} phu={[h.LoaiHD, ngay(h.Ngay), h.NgayHetHan && 'hết hạn ' + ngay(h.NgayHetHan)].filter(Boolean).join(' · ')}
                      ben={h.coFile ? (pdf.dang === h.SoHD ? 'Đang tải…' : 'Chia sẻ PDF') : 'Chưa có file'} benMau={h.coFile ? mau.brand : mau.xam}
                      onPress={h.coFile ? () => pdf.tai(h.SoHD) : undefined} bieuTuong="document-text-outline" />
                  </View>
                ))}
                <ChuLoi chu={pdf.loi} />
              </The>
            </>
          ) : null}
        </>
      ) : null}
    </KhungTrang>
  );
}

function NutTron({ bieuTuong, chu, onPress, testID }: { bieuTuong: keyof typeof Ionicons.glyphMap; chu: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.nutTron, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={chu} testID={testID}>
      <View style={s.vongTron}><Ionicons name={bieuTuong} size={22} color={mau.brand} /></View>
      <Text style={s.chuNut}>{chu}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  muc: { marginBottom: 14 },
  hangNut: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  nutTron: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.74)', borderRadius: 20, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)' },
  vongTron: { width: 44, height: 44, borderRadius: 22, backgroundColor: mau.brandNhat, alignItems: 'center', justifyContent: 'center' },
  chuNut: { fontSize: 13, fontWeight: '700', color: mau.chu, marginTop: 6 },
  soLon: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  chuPhu: { fontSize: 14, color: mau.chuNhat, marginTop: 2 },
  dongDon: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  tien: { fontSize: 15, fontWeight: '800', color: mau.chu },
});
