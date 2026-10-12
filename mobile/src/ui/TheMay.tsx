// Thẻ một máy đã bán: tên máy, tình trạng bảo hành, IMEI, khách (bấm mở hồ sơ), SĐT (bấm gọi), ngày giao, hạn bảo hành, chứng từ.
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { MayBaoHanh } from '../lib/api';
import { ngay, tinhTrangBaoHanh, type TinhTrangBH } from '../lib/dinhDang';
import { linkGoi } from '../lib/lienHe';
import { DongTT, Nhan, type MAU_NHAN } from './DanhSach';
import { Nut } from './Nut';
import { The } from './The';
import { mau } from './theme';

export const LOAI_TT: Record<TinhTrangBH['loai'], keyof typeof MAU_NHAN> = { con: 'xanh', sap: 'vang', het: 'do', khong: 'xam' };

export function TheMay({ x }: { x: MayBaoHanh }) {
  const tt = tinhTrangBaoHanh(x);
  return (
    <The style={{ marginBottom: 12 }} testID="the-may">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Text style={[s.tenMay, { flex: 1 }]}>{x.TenHang}</Text>
        <Nhan chu={tt.nhan} loai={LOAI_TT[tt.loai]} testID="tinh-trang" />
      </View>
      <DongTT nhan="IMEI/serial" giaTri={x.IMEIKhop || x.IMEI || '—'} dam />
      <DongTT nhan="Khách" giaTri={x.TenKH || 'Khách lẻ'} onPress={x.MaKH ? () => router.push({ pathname: '/khach/[ma]', params: { ma: x.MaKH } }) : undefined} />
      {x.SDT ? <DongTT nhan="Điện thoại" giaTri={x.SDT} onPress={() => { Linking.openURL(linkGoi(x.SDT)); }} /> : null}
      <DongTT nhan="Ngày giao" giaTri={ngay(x.Ngay)} />
      <DongTT nhan="Hết bảo hành" giaTri={x.HetHan ? ngay(x.HetHan) : 'Không bảo hành'} />
      <DongTT nhan="Chứng từ" giaTri={[x.SoDH && 'Đơn ' + x.SoDH, 'Phiếu ' + x.SoPK].filter(Boolean).join(' · ')} />
      {x.SoDH && x.IMEI ? (
        <Nut chu="Khách trả máy" phu bieuTuong="return-down-back" style={{ marginTop: 12, minHeight: 44 }} testID="nut-tra-may-ban"
          onPress={() => router.push({ pathname: '/tra-hang', params: { don: x.SoDH, ma: x.MaHH, ten: x.TenHang, imei: x.IMEIKhop || x.IMEI.split(',')[0].trim(), kh: x.MaKH || undefined, tenKH: x.MaKH ? x.TenKH : undefined } })} />
      ) : null}
      <Nut chu={tt.loai === 'het' || tt.loai === 'khong' ? 'Nhận sửa chữa' : 'Nhận bảo hành'} phu bieuTuong="construct-outline" style={{ marginTop: 10, minHeight: 44 }} testID="nut-nhan-bh"
        onPress={() => router.push({ pathname: '/sua-chua/[so]', params: { so: 'moi', loai: tt.loai === 'het' || tt.loai === 'khong' ? 'Sửa chữa' : 'Bảo hành', ma: x.MaKH || undefined, ten: x.MaKH ? x.TenKH : undefined, sdt: x.MaKH ? x.SDT : undefined, may: x.TenHang, imei: x.IMEIKhop || x.IMEI.split(',')[0]?.trim() } })} />
    </The>
  );
}

const s = StyleSheet.create({
  tenMay: { fontSize: 18, fontWeight: '800', color: mau.chu },
});
