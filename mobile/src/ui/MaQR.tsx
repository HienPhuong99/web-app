// Ảnh mã VietQR chuyển khoản (số tiền + nội dung có sẵn) kèm tên ngân hàng, số tài khoản, chủ tài khoản.
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { CauHinh } from '../lib/api';
import { tien } from '../lib/dinhDang';
import { linkVietQR } from '../lib/lienHe';
import { ChuNhat } from './DanhSach';
import { mau } from './theme';

export function MaQR({ qr, soTien, noiDung }: { qr: CauHinh['qr']; soTien: number; noiDung: string }) {
  const url = linkVietQR(qr, soTien, noiDung);
  if (!url) return <ChuNhat chu="Chưa khai tài khoản nhận chuyển khoản. Quản trị khai trên web: Cài đặt → Thông tin cửa hàng → Mã QR chuyển khoản." />;
  return (
    <View style={s.qr} testID="ma-qr">
      <Image source={{ uri: url }} style={{ width: 240, height: 240 }} contentFit="contain" accessibilityLabel={'Mã QR chuyển khoản ' + tien(soTien)} testID="anh-qr" />
      <Text style={s.tenHang}>{qr!.nganHang} · {qr!.soTK}</Text>
      {qr!.chuTK ? <Text style={s.imei}>{qr!.chuTK}</Text> : null}
      <Text style={[s.tong, { marginTop: 4 }]}>{tien(soTien)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  qr: { alignItems: 'center', marginTop: 14, padding: 14, backgroundColor: '#fff', borderRadius: 20 },
  tenHang: { fontSize: 16, fontWeight: '700', color: mau.chu },
  imei: { fontSize: 13, color: mau.chuNhat, marginTop: 2 },
  tong: { fontSize: 22, fontWeight: '800', color: mau.camDam },
});
