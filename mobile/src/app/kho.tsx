// Kho: kiểm tra một IMEI đang ở đâu (còn trong kho / đã bán / chưa nhập), tồn kho từng mặt hàng (lọc còn / sắp hết / hết, sắp theo tồn, bán chạy, giá); bấm mặt hàng xem thẻ kho.
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { HangKho, MaKho } from '../lib/api';
import { ngay, tien } from '../lib/dinhDang';
import { LOC_KHO, SX_KHO, demKho, locKho, sapHet, sxMacDinh, type LocKho, type SxKho } from '../lib/locDs';
import { chuanHoaMa } from '../lib/maQuet';
import { useDuLieu } from '../lib/useDuLieu';
import { BoLoc, BoSapXep } from '../ui/BoLoc';
import { ChuLoi, ChuNhat, Dong, DongTT, KhungDanhSach, Nhan, OTim } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { HangLayMa } from '../ui/KhungQuet';
import { Nut } from '../ui/Nut';
import { The } from '../ui/The';
import { DongCapNhat, KhungCho, useKeo } from '../ui/TrangThaiTai';
import { mau } from '../ui/theme';

export default function KhoMan() {
  const dl = useDuLieu<HangKho[]>('khoMay', []), hang = dl.du, keo = useKeo(dl.lamMoi);
  const [q, setQ] = useState(''), [loc, setLoc] = useState<LocKho>('tat'), [sx, setSx] = useState<SxKho>(sxMacDinh(SX_KHO));

  const ds = useMemo(() => (hang ? locKho(hang, q, loc, sx) : null), [hang, q, loc, sx]);
  const tongTon = (hang ?? []).reduce((s, h) => s + Math.max(0, h.ton), 0);

  return (
    <KhungDanhSach coTab={false} refreshControl={<RefreshControl {...keo} />} testID="ds-kho"
      dau={
        <View style={{ marginBottom: 12 }}>
          <DauTrang tieuDe="Kho hàng" phu={hang ? `${hang.length} mặt hàng · ${tongTon} sản phẩm còn trong kho` : undefined} />
          <DongCapNhat dl={dl} />
          <Nut chu="Thu mua máy cũ (khách bán đứt)" phu bieuTuong="phone-portrait-outline" onPress={() => router.push('/thu-mua')} style={{ marginBottom: 12, minHeight: 46 }} testID="nut-thu-mua" />
          <KiemTraIMEI />
          <OTim value={q} onChangeText={setQ} placeholder="Tìm hàng theo tên, mã, model" testID="o-tim-kho" />
          <BoLoc ds={LOC_KHO} chon={loc} onChon={setLoc} dem={v => demKho(hang ?? [], v)} testID="loc-kho" />
          <BoSapXep ds={SX_KHO} chon={sx} onChon={setSx} testID="sx-kho" />
          {!hang ? <ChuLoi chu={dl.loi} /> : null}
        </View>
      }
      ds={ds} khoa={h => h.MaHH} rong="Không có mặt hàng nào phù hợp." choTai={dl.loi ? null : <KhungCho dong={6} />}
      ve={h => (
        <Dong chinh={h.TenHang} phu={[h.GiaLe ? 'Lẻ ' + tien(h.GiaLe) : '', h.MaHH].filter(Boolean).join(' · ')}
          ben={`Tồn ${h.ton}`} benMau={h.ton <= 0 ? mau.do : sapHet(h) ? mau.vang : mau.xanh} benPhu={h.DVT || undefined}
          onPress={() => router.push({ pathname: '/kho/[ma]', params: { ma: h.MaHH, ten: h.TenHang } })} testID={'kho-' + h.MaHH} />
      )}
    />
  );
}

const TT_MA: Record<MaKho['trangThai'], { chu: string; loai: 'xanh' | 'xam' | 'vang' }> = {
  trongKho: { chu: 'Còn trong kho', loai: 'xanh' }, daBan: { chu: 'Đã bán', loai: 'xam' }, chuaCo: { chu: 'Chưa nhập kho', loai: 'vang' },
};

function KiemTraIMEI() {
  const { goi } = useAuth();
  const [ma, setMa] = useState(''), [kq, setKq] = useState<MaKho | null>(null), [loi, setLoi] = useState(''), [dang, setDang] = useState(false);
  const tra = async (raw: string) => {
    const m = chuanHoaMa(raw);
    setMa(m); setLoi(''); setKq(null);
    if (m.length < 4) return setLoi('Nhập IMEI/serial (ít nhất 4 ký tự).');
    setDang(true);
    try { setKq(await goi<MaKho>('traMaKho', m)); } catch (e) { setLoi((e as Error).message); } finally { setDang(false); }
  };
  const tt = kq ? TT_MA[kq.trangThai] : null;
  return (
    <The nhan="Kiểm tra IMEI" mauNhan={mau.brand} style={{ marginBottom: 14 }} testID="kiem-tra-imei">
      <View style={s.hang}>
        <TextInput style={s.o} value={ma} onChangeText={setMa} placeholder="IMEI / serial" placeholderTextColor={mau.xam} autoCapitalize="characters" autoCorrect={false}
          returnKeyType="search" onSubmitEditing={() => tra(ma)} testID="o-kiem-imei" />
        <Pressable onPress={() => tra(ma)} style={s.nut} disabled={dang} accessibilityLabel="Kiểm tra" testID="nut-kiem-imei">
          <Ionicons name={dang ? 'hourglass-outline' : 'search'} size={22} color="#fff" />
        </Pressable>
      </View>
      <HangLayMa onMa={m => tra(m)} onLoi={setLoi} />
      <ChuLoi chu={loi} />
      {kq && tt ? (
        <View style={{ marginTop: 12 }} testID="kq-imei">
          <Nhan chu={tt.chu} loai={tt.loai} testID="tt-imei" />
          {kq.trangThai === 'chuaCo' ? <ChuNhat chu={`Mã ${kq.ma} chưa có trong phiếu nhập/xuất nào.`} /> : (
            <>
              <DongTT nhan="Máy" giaTri={kq.TenHang || kq.MaHH || ''} />
              <DongTT nhan="IMEI/serial" giaTri={kq.ma} dam />
              <DongTT nhan={kq.trangThai === 'daBan' ? 'Bán ngày' : 'Nhập ngày'} giaTri={`${ngay(kq.Ngay)}${kq.DoiTac ? ' · ' + kq.DoiTac : ''}`} />
              <DongTT nhan="Phiếu" giaTri={[kq.SoPK, kq.SoDH && 'đơn ' + kq.SoDH].filter(Boolean).join(' · ')} />
              {kq.trangThai === 'trongKho' && kq.GiaLe ? <DongTT nhan="Giá lẻ" giaTri={tien(kq.GiaLe)} /> : null}
            </>
          )}
        </View>
      ) : null}
    </The>
  );
}

const s = StyleSheet.create({
  hang: { flexDirection: 'row', gap: 8 },
  o: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: mau.chu },
  nut: { width: 50, borderRadius: 14, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
});
