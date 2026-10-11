// Thẻ kho một mặt hàng: tồn hiện tại và từng lần nhập / xuất kèm IMEI/serial; lọc chỉ nhập / chỉ xuất, sắp theo ngày hoặc số lượng.
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import type { DongTheKho } from '../../lib/api';
import { ngay } from '../../lib/dinhDang';
import { LOC_PHIEU, SX_PHIEU, locTheKho, type LocPhieu, type SxPhieu } from '../../lib/locDs';
import { BoLoc } from '../../ui/BoLoc';
import { ChuLoi, ChuNhat, KhungTrang, Nhan, Vach } from '../../ui/DanhSach';
import { DauTrang } from '../../ui/DauTrang';
import { The } from '../../ui/The';
import { mau } from '../../ui/theme';

export default function TheKhoMan() {
  const { ma, ten } = useLocalSearchParams<{ ma: string; ten?: string }>();
  const { goi } = useAuth();
  const [goc, setGoc] = useState<DongTheKho[] | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const [loc, setLoc] = useState<LocPhieu>('tat'), [sx, setSx] = useState<SxPhieu>('moi');
  const tai = useCallback(async () => {
    setDangTai(true);
    try { setGoc(await goi<DongTheKho[]>('theKho', ma)); setLoi(''); } catch (e) { setLoi((e as Error).message); } finally { setDangTai(false); }
  }, [goi, ma]);
  useFocusEffect(useCallback(() => { tai(); }, [tai]));

  const ds = useMemo(() => (goc ? locTheKho(goc, loc, sx) : null), [goc, loc, sx]);
  const nhap = (goc ?? []).filter(d => d.Loai === 'Nhập').reduce((s, d) => s + d.SoLuong, 0), xuat = (goc ?? []).reduce((s, d) => s + (d.Loai === 'Nhập' ? 0 : d.SoLuong), 0);
  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl refreshing={dangTai && !!goc} onRefresh={tai} tintColor={mau.cam} />}>
      <DauTrang tieuDe={ten || ma} phu={goc ? `Tồn ${nhap - xuat} · đã nhập ${nhap} · đã xuất ${xuat}` : ma} />
      <ChuLoi chu={loi} />
      {!ds && !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {goc && goc.length > 1 ? (
        <View style={{ marginBottom: 12, marginTop: -4 }}>
          <BoLoc ds={LOC_PHIEU} chon={loc} onChon={setLoc} testID="loc-phieu" />
          <BoLoc ds={SX_PHIEU} chon={sx} onChon={setSx} sapXep testID="sx-phieu" />
        </View>
      ) : null}
      {ds ? (
        <The style={{ paddingVertical: 6 }} testID="the-kho">
          {!ds.length ? <ChuNhat chu={goc?.length ? `Không có phiếu ${loc === 'nhap' ? 'nhập' : 'xuất'} nào.` : 'Mặt hàng này chưa có phiếu nhập / xuất nào.'} style={{ marginVertical: 10 }} /> : null}
          {ds.map((d, i) => (
            <View key={d.SoPK + i}>
              {i ? <Vach /> : null}
              <View style={s.dong}>
                <View style={{ flex: 1 }}>
                  <Text style={s.chinh}>{d.DoiTac || (d.Loai === 'Nhập' ? 'Nhập kho' : 'Xuất kho')}</Text>
                  <Text style={s.phu}>{[ngay(d.Ngay), d.SoPK, d.SoDH && 'đơn ' + d.SoDH].filter(Boolean).join(' · ')}</Text>
                  {d.IMEI ? <Text style={s.imei} selectable>{d.IMEI}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[s.sl, { color: d.Loai === 'Nhập' ? mau.xanh : mau.camDam }]}>{d.Loai === 'Nhập' ? '+' : '−'}{d.SoLuong}</Text>
                  <Nhan chu={d.Loai} loai={d.Loai === 'Nhập' ? 'xanh' : 'cam'} />
                </View>
              </View>
            </View>
          ))}
        </The>
      ) : null}
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  dong: { flexDirection: 'row', paddingVertical: 11, gap: 12 },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 2 },
  imei: { fontSize: 13, color: mau.chuPhu, marginTop: 4, fontVariant: ['tabular-nums'] },
  sl: { fontSize: 18, fontWeight: '800' },
});
