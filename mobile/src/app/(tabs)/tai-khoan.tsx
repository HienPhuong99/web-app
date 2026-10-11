// Tab Thêm: tài khoản đang đăng nhập, lối vào Kho / Hợp đồng / Điện thoại đăng nhập, khóa Face ID, thông báo mỗi sáng, đăng xuất.
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { MAY_CHU_MAC_DINH, useAuth } from '../../lib/auth';
import type { ThietBi } from '../../lib/api';
import { useKhoa } from '../../lib/khoa';
import { coThongBao, layMaThongBao } from '../../lib/thongBao';
import { ChuLoi, Dong, KhungTrang, Vach } from '../../ui/DanhSach';
import { hoi } from '../../ui/hoi';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { mau } from '../../ui/theme';

export default function ThemMan() {
  const { user, tenCuaHang, mayChu, dangXuat, goi } = useAuth();
  const khoa = useKhoa();
  const [dangChay, setDangChay] = useState(false);
  const [thongBao, setThongBao] = useState<boolean | null>(null), [dangTB, setDangTB] = useState(false), [loiTB, setLoiTB] = useState(''), [baoTB, setBaoTB] = useState('');
  const [loiKhoa, setLoiKhoa] = useState('');

  // Thông báo đang bật hay tắt lưu ở máy chủ (cột PushToken của máy này)
  useFocusEffect(useCallback(() => {
    if (!coThongBao) return;
    goi<ThietBi[]>('dsThietBi').then(ds => setThongBao(!!ds.find(x => x.mayNay)?.thongBao)).catch(() => {});
  }, [goi]));

  const doiThongBao = async (bat: boolean) => {
    setDangTB(true); setLoiTB(''); setBaoTB('');
    try {
      await goi('datThongBao', bat ? await layMaThongBao() : '');
      setThongBao(bat);
      if (bat) setBaoTB('Đã bật. Mỗi sáng app gửi tóm tắt việc cần làm (cùng giờ email sáng, mặc định 7 giờ) khi có việc.');
    } catch (e) { setLoiTB((e as Error).message); } finally { setDangTB(false); }
  };
  const guiThu = async () => {
    setDangTB(true); setLoiTB(''); setBaoTB('');
    try { await goi('thuThongBao'); setBaoTB('Đã gửi. Thông báo sẽ hiện sau vài giây.'); } catch (e) { setLoiTB((e as Error).message); } finally { setDangTB(false); }
  };
  const doiKhoa = async (bat: boolean) => {
    setLoiKhoa('');
    try { await khoa.datBat(bat); } catch (e) { setLoiKhoa((e as Error).message); }
  };
  const thoat = async () => {
    if (!(await hoi('Đăng xuất?', 'Lần sau mở app phải nhập lại mật khẩu.', 'Đăng xuất'))) return;
    setDangChay(true);
    await dangXuat();
  };

  return (
    <KhungTrang>
      <Text style={s.tieuDe}>Thêm</Text>
      <The style={s.muc}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.anh}><Text style={s.anhChu}>{(user?.ten || '?').charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.ten} testID="tk-ten">{user?.ten}</Text>
            <Text style={s.phu}>{user?.u} · {user?.vaiTro === 'admin' ? 'Quản trị' : 'Nhân viên'} · {tenCuaHang}</Text>
          </View>
        </View>
      </The>

      <The style={[s.muc, { paddingVertical: 6 }]}>
        <Dong chinh="Kho hàng" phu="Tồn kho, kiểm tra IMEI, thẻ kho" bieuTuong="cube-outline" onPress={() => router.push('/kho')} testID="mo-kho" />
        <Vach />
        <Dong chinh="Hợp đồng" phu="Tìm và chia sẻ file PDF" bieuTuong="document-text-outline" mauBT={mau.camDam} onPress={() => router.push('/hop-dong')} testID="mo-hop-dong" />
        <Vach />
        <Dong chinh="Điện thoại đăng nhập" phu="Xem và đăng xuất máy khác" bieuTuong="phone-portrait-outline" mauBT={mau.xanh} onPress={() => router.push('/thiet-bi')} testID="mo-thiet-bi" />
      </The>

      <The nhan="Bảo mật" mauNhan={mau.brand} style={s.muc}>
        <View style={s.hangCongTac}>
          <View style={{ flex: 1 }}>
            <Text style={s.chinh}>Khóa app bằng {khoa.tenCach || 'Face ID / vân tay'}</Text>
            <Text style={s.phu}>{khoa.coTheDung ? 'Hỏi khi mở app và khi quay lại sau hơn 1 phút.' : 'Máy này không hỗ trợ (hoặc chưa cài Face ID / vân tay / mã khóa).'}</Text>
          </View>
          <Switch value={khoa.bat} onValueChange={doiKhoa} disabled={!khoa.coTheDung} trackColor={{ true: mau.xanh, false: '#d0d5dd' }} testID="cong-tac-khoa" />
        </View>
        <ChuLoi chu={loiKhoa} />
      </The>

      <The nhan="Thông báo" mauNhan={mau.camDam} style={s.muc}>
        <View style={s.hangCongTac}>
          <View style={{ flex: 1 }}>
            <Text style={s.chinh}>Việc cần làm mỗi sáng</Text>
            <Text style={s.phu}>{coThongBao ? 'Đợt trả góp đến hạn, hợp đồng sắp hết, đơn trễ giao, hàng sắp hết.' : 'Chỉ có trên app điện thoại.'}</Text>
          </View>
          <Switch value={!!thongBao} onValueChange={doiThongBao} disabled={!coThongBao || dangTB || thongBao === null} trackColor={{ true: mau.xanh, false: '#d0d5dd' }} testID="cong-tac-thong-bao" />
        </View>
        {thongBao ? <Nut chu="Gửi thử thông báo" phu bieuTuong="notifications-outline" onPress={guiThu} dangChay={dangTB} style={{ marginTop: 12, minHeight: 46 }} /> : null}
        {baoTB ? <Text style={[s.phu, { color: mau.xanh, marginTop: 10 }]}>{baoTB}</Text> : null}
        <ChuLoi chu={loiTB} />
      </The>

      <The nhan="Máy này" mauNhan={mau.xam} style={s.muc}>
        <Text style={s.dong}>Máy chủ: {mayChu === MAY_CHU_MAC_DINH ? 'web app phuonghihi' : mayChu}</Text>
        <Text style={s.dong}>Phiên bản app: {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        <Text style={s.ghiChu}>Mất máy? Vào Điện thoại đăng nhập trên một máy khác (hoặc trang web) và đăng xuất máy đó.</Text>
      </The>
      <Nut chu="Đăng xuất" phu nguyHiem bieuTuong="log-out-outline" onPress={thoat} dangChay={dangChay} testID="nut-dang-xuat" />
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  tieuDe: { fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5, marginTop: 6, marginBottom: 16 },
  muc: { marginBottom: 14 },
  anh: { width: 56, height: 56, borderRadius: 28, backgroundColor: mau.brand, alignItems: 'center', justifyContent: 'center' },
  anhChu: { color: '#fff', fontSize: 24, fontWeight: '800' },
  ten: { fontSize: 20, fontWeight: '800', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 3, lineHeight: 19 },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  hangCongTac: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dong: { fontSize: 15, color: mau.chu, marginTop: 6 },
  ghiChu: { fontSize: 14, color: mau.chuNhat, marginTop: 12, lineHeight: 20 },
});
