// Thẻ kho một mặt hàng: tồn hiện tại và từng lần nhập / xuất kèm IMEI/serial; lọc chỉ nhập / chỉ xuất, sắp theo ngày hoặc số lượng.
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { DongTheKho } from '../../lib/api';
import { ngay } from '../../lib/dinhDang';
import { LOC_PHIEU, SX_PHIEU, locTheKho, sxMacDinh, type LocPhieu, type SxPhieu } from '../../lib/locDs';
import { useDuLieu } from '../../lib/useDuLieu';
import { BoLoc, BoSapXep } from '../../ui/BoLoc';
import { ChuLoi, KhungDanhSach, Nhan } from '../../ui/DanhSach';
import { DauTrang } from '../../ui/DauTrang';
import { DongCapNhat, KhungCho, useKeo } from '../../ui/TrangThaiTai';
import { mau } from '../../ui/theme';

export default function TheKhoMan() {
  const { ma, ten } = useLocalSearchParams<{ ma: string; ten?: string }>();
  const dl = useDuLieu<DongTheKho[]>('theKho', [ma]), goc = dl.du, keo = useKeo(dl.lamMoi);
  const [loc, setLoc] = useState<LocPhieu>('tat'), [sx, setSx] = useState<SxPhieu>(sxMacDinh(SX_PHIEU));

  const ds = useMemo(() => (goc ? locTheKho(goc, loc, sx) : null), [goc, loc, sx]);
  const nhap = (goc ?? []).filter(d => d.Loai === 'Nhập').reduce((s, d) => s + d.SoLuong, 0), xuat = (goc ?? []).reduce((s, d) => s + (d.Loai === 'Nhập' ? 0 : d.SoLuong), 0);
  return (
    <KhungDanhSach coTab={false} refreshControl={<RefreshControl {...keo} />} testID="the-kho"
      dau={
        <View>
          <DauTrang tieuDe={ten || ma} phu={goc ? `Tồn ${nhap - xuat} · đã nhập ${nhap} · đã xuất ${xuat}` : ma} />
          <DongCapNhat dl={dl} />
          {!goc ? <ChuLoi chu={dl.loi} /> : null}
          {goc && goc.length > 1 ? (
            <View style={{ marginBottom: 12 }}>
              <BoLoc ds={LOC_PHIEU} chon={loc} onChon={setLoc} testID="loc-phieu" />
              <BoSapXep ds={SX_PHIEU} chon={sx} onChon={setSx} testID="sx-phieu" />
            </View>
          ) : null}
        </View>
      }
      ds={ds} khoa={(d, i) => d.SoPK + '|' + i} choTai={dl.loi ? null : <KhungCho dong={4} />}
      rong={goc?.length ? `Không có phiếu ${loc === 'nhap' ? 'nhập' : 'xuất'} nào.` : 'Mặt hàng này chưa có phiếu nhập / xuất nào.'}
      ve={d => (
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
      )}
    />
  );
}

const s = StyleSheet.create({
  dong: { flexDirection: 'row', paddingVertical: 11, gap: 12 },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 2 },
  imei: { fontSize: 13, color: mau.chuPhu, marginTop: 4, fontVariant: ['tabular-nums'] },
  sl: { fontSize: 18, fontWeight: '800' },
});
