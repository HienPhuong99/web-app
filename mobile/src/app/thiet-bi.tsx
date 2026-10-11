// Điện thoại đang đăng nhập: nhân viên thấy máy của mình, quản trị thấy mọi máy. Đăng xuất từ xa máy bị mất / máy cũ.
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/auth';
import type { ThietBi } from '../lib/api';
import { ngay } from '../lib/dinhDang';
import { LOC_MAY, SX_MAY, locMay, type LocMay, type SxMay } from '../lib/locDs';
import { BoLoc } from '../ui/BoLoc';
import { ChuLoi, ChuNhat, KhungTrang, Nhan, Vach } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { hoi } from '../ui/hoi';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { mau } from '../ui/theme';

const gio = (s: string) => `${ngay(s)} ${String(s || '').slice(11, 16)}`.trim();

export default function ThietBiMan() {
  const { goi, user } = useAuth();
  const [goc, setGoc] = useState<ThietBi[] | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false), [dangXoa, setDangXoa] = useState('');
  const [loc, setLoc] = useState<LocMay>('tat'), [sx, setSx] = useState<SxMay>('gan');
  const ds = useMemo(() => (goc ? locMay(goc, loc, sx) : null), [goc, loc, sx]);
  const tai = useCallback(async () => {
    setDangTai(true);
    try { setGoc(await goi<ThietBi[]>('dsThietBi')); setLoi(''); } catch (e) { setLoi((e as Error).message); } finally { setDangTai(false); }
  }, [goi]);
  useFocusEffect(useCallback(() => { tai(); }, [tai]));

  const xoa = async (t: ThietBi) => {
    if (!(await hoi(`Đăng xuất "${t.TenMay}"?`, `Máy này${t.TenDangNhap !== user?.u ? ' của ' + t.TenDangNhap : ''} phải nhập lại mật khẩu mới vào được app.`, 'Đăng xuất'))) return;
    setDangXoa(t.MaMay); setLoi('');
    try { await goi('xoaThietBi', t.MaMay); setGoc(d => (d ?? []).filter(x => x.MaMay !== t.MaMay)); }
    catch (e) { setLoi((e as Error).message); } finally { setDangXoa(''); }
  };

  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl refreshing={dangTai && !!goc} onRefresh={tai} tintColor={mau.cam} />}>
      <DauTrang tieuDe="Điện thoại đăng nhập" phu={user?.vaiTro === 'admin' ? 'Mọi điện thoại đang đăng nhập app của cửa hàng.' : 'Các điện thoại đang đăng nhập tài khoản của bạn.'} />
      <ChuLoi chu={loi} testID="loi-thiet-bi" />
      {!ds && !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {goc && goc.length > 1 ? (
        <View style={{ marginBottom: 12, marginTop: -4 }}>
          <BoLoc ds={LOC_MAY} chon={loc} onChon={setLoc} testID="loc-may" />
          <BoLoc ds={SX_MAY} chon={sx} onChon={setSx} sapXep testID="sx-may" />
        </View>
      ) : null}
      {ds ? (
        <The style={{ paddingVertical: 6 }} testID="ds-thiet-bi">
          {!ds.length ? <ChuNhat chu="Không có điện thoại nào phù hợp." style={{ marginVertical: 10 }} /> : null}
          {ds.map((t, i) => (
            <View key={t.MaMay}>
              {i ? <Vach /> : null}
              <View style={s.dong} testID="thiet-bi">
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    <Text style={s.ten}>{t.TenMay}</Text>
                    {t.mayNay ? <Nhan chu="Máy này" loai="xanh" testID="may-nay" /> : null}
                    {t.thongBao ? <Nhan chu="Thông báo" loai="brand" /> : null}
                  </View>
                  <Text style={s.phu}>{t.TenDangNhap} · dùng gần nhất {gio(t.LanCuoi)}</Text>
                  <Text style={s.phu}>Đăng nhập {gio(t.NgayTao)}</Text>
                </View>
              </View>
              {!t.mayNay ? <Nut chu="Đăng xuất máy này" phu nguyHiem bieuTuong="log-out-outline" onPress={() => xoa(t)} dangChay={dangXoa === t.MaMay} style={{ minHeight: 44, marginBottom: 10 }} testID="nut-xoa-thiet-bi" /> : null}
            </View>
          ))}
        </The>
      ) : null}
      <ChuNhat chu="Muốn đăng xuất chính máy này: vào tab Thêm → Đăng xuất. Mỗi tài khoản đăng nhập tối đa 10 máy; quá thì máy lâu không dùng nhất tự đăng xuất." />
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  dong: { paddingVertical: 11 },
  ten: { fontSize: 16, fontWeight: '700', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 3 },
});
