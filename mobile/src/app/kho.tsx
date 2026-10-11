// Kho: kiểm tra một IMEI đang ở đâu (còn trong kho / đã bán / chưa nhập), tồn kho từng mặt hàng, lọc hàng sắp hết; bấm mặt hàng xem thẻ kho.
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import type { HangKho, MaKho } from '../lib/api';
import { ngay, tien } from '../lib/dinhDang';
import { boDau } from '../lib/lienHe';
import { chuanHoaMa } from '../lib/maQuet';
import { Chip } from '../ui/Chip';
import { ChuLoi, ChuNhat, Dong, DongTT, KhungTrang, Nhan, OTim, Vach } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { HangLayMa } from '../ui/KhungQuet';
import { The } from '../ui/The';
import { mau } from '../ui/theme';

type Loc = 'tat' | 'sap' | 'het';
const sapHet = (h: HangKho) => h.ton > 0 && h.ton <= h.TonToiThieu;

export default function KhoMan() {
  const { goi } = useAuth();
  const [hang, setHang] = useState<HangKho[] | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const [q, setQ] = useState(''), [loc, setLoc] = useState<Loc>('tat');

  const tai = useCallback(async () => {
    setDangTai(true);
    try { setHang(await goi<HangKho[]>('khoMay')); setLoi(''); } catch (e) { setLoi((e as Error).message); } finally { setDangTai(false); }
  }, [goi]);
  useFocusEffect(useCallback(() => { tai(); }, [tai]));

  const ds = useMemo(() => {
    const w = boDau(q).split(/\s+/).filter(Boolean);
    return (hang ?? []).filter(h => (loc === 'tat' || (loc === 'sap' ? sapHet(h) : h.ton <= 0)) && w.every(x => boDau(`${h.TenHang} ${h.MaHH} ${h.Model} ${h.NhomHang}`).includes(x)));
  }, [hang, q, loc]);
  const tongTon = (hang ?? []).reduce((s, h) => s + Math.max(0, h.ton), 0);

  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl refreshing={dangTai && !!hang} onRefresh={tai} tintColor={mau.cam} />}>
      <DauTrang tieuDe="Kho hàng" phu={hang ? `${hang.length} mặt hàng · ${tongTon} sản phẩm còn trong kho` : undefined} />
      <KiemTraIMEI />
      <OTim value={q} onChangeText={setQ} placeholder="Tìm hàng theo tên, mã, model" testID="o-tim-kho" />
      <View style={s.chips}>
        <Chip chu="Tất cả" chon={loc === 'tat'} onPress={() => setLoc('tat')} />
        <Chip chu={`Sắp hết (${(hang ?? []).filter(sapHet).length})`} chon={loc === 'sap'} onPress={() => setLoc('sap')} testID="loc-sap-het" />
        <Chip chu={`Hết hàng (${(hang ?? []).filter(h => h.ton <= 0).length})`} chon={loc === 'het'} onPress={() => setLoc('het')} testID="loc-het" />
      </View>
      <ChuLoi chu={loi} />
      {!hang && !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {hang ? (
        <The style={{ paddingVertical: 6 }} testID="ds-kho">
          {!ds.length ? <ChuNhat chu="Không có mặt hàng nào phù hợp." style={{ marginVertical: 10 }} /> : null}
          {ds.map((h, i) => (
            <View key={h.MaHH}>
              {i ? <Vach /> : null}
              <Dong chinh={h.TenHang} phu={[h.GiaLe ? 'Lẻ ' + tien(h.GiaLe) : '', h.MaHH].filter(Boolean).join(' · ')}
                ben={`Tồn ${h.ton}`} benMau={h.ton <= 0 ? mau.do : sapHet(h) ? mau.vang : mau.xanh} benPhu={h.DVT || undefined}
                onPress={() => router.push({ pathname: '/kho/[ma]', params: { ma: h.MaHH, ten: h.TenHang } })} testID={'kho-' + h.MaHH} />
            </View>
          ))}
        </The>
      ) : null}
    </KhungTrang>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  hang: { flexDirection: 'row', gap: 8 },
  o: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: mau.chu },
  nut: { width: 50, borderRadius: 14, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
});
