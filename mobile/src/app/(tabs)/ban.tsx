// Bán nhanh tại quầy: quét / chọn ảnh / dán / gõ IMEI (tự biết máy nào, giá lẻ, còn trong kho không), thêm phụ kiện / dịch vụ,
// chọn khách (hoặc khách mới, khách lẻ), khách trả bao nhiêu, hình thức nào (mã VietQR khi chuyển khoản), rồi một nút:
// máy chủ lập đơn hàng + phiếu xuất kho + phiếu thu (API banNhanh).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import type { BanNhanhKQ, CauHinh, DsKhach, HangKho, KhachTom, MaKho } from '../../lib/api';
import { ngay, tien } from '../../lib/dinhDang';
import { docTien, doiSoLuong, dongGui, soTienNhap, suaGia, themHang, themMay, tongGio, xoaDong, type DongGio } from '../../lib/gioHang';
import { boDau } from '../../lib/lienHe';
import { chuanHoaMa, goiYMa } from '../../lib/maQuet';
import { ChuLoi, ChuNhat, Dong, DongTT, KhungTrang, Nhan, OTim, TieuDeMuc, Vach } from '../../ui/DanhSach';
import { hoi } from '../../ui/hoi';
import { Chip } from '../../ui/Chip';
import { KhungQuet } from '../../ui/KhungQuet';
import { MaQR } from '../../ui/MaQR';
import { Nut } from '../../ui/Nut';
import { The } from '../../ui/The';
import { mau } from '../../ui/theme';

type Khach = { MaKH: string; TenKH: string; SDT?: string } | { moi: true; TenKH: string; SDT: string };

export default function BanMan() {
  const { goi } = useAuth();
  const p = useLocalSearchParams<{ ma?: string; ten?: string }>();
  const [gio, setGio] = useState<DongGio[]>([]);
  const [khach, setKhach] = useState<Khach | null>(null);
  const [ch, setCh] = useState<CauHinh | null>(null), [hang, setHang] = useState<HangKho[] | null>(null);
  const [vat, setVat] = useState(0), [soThu, setSoThu] = useState<number | null>(null), [hinhThuc, setHinhThuc] = useState('Tiền mặt'), [ghiChu, setGhiChu] = useState('');
  const [camera, setCamera] = useState(false), [focus, setFocus] = useState(false);
  const [maGo, setMaGo] = useState(''), [loiMa, setLoiMa] = useState(''), [dangTraMa, setDangTraMa] = useState(false);
  const [maChuaCo, setMaChuaCo] = useState(''); // IMEI chưa từng nhập kho: chờ chọn mặt hàng
  const [chonHang, setChonHang] = useState(false);
  const [loi, setLoi] = useState(''), [dangLuu, setDangLuu] = useState(false), [kq, setKq] = useState<BanNhanhKQ | null>(null);
  const daQuet = useRef<{ ma: string; luc: number }>({ ma: '', luc: 0 });

  useFocusEffect(useCallback(() => { setFocus(true); return () => setFocus(false); }, []));

  // Cài đặt (hình thức thu, VAT, tài khoản nhận tiền) và danh sách hàng: lấy một lần khi mở tab
  useEffect(() => {
    goi<CauHinh>('cauHinhMay').then(c => { setCh(c); setVat(c.vat); setHinhThuc(c.hinhThuc[0] || 'Tiền mặt'); }).catch(e => setLoi((e as Error).message));
    goi<HangKho[]>('khoMay').then(setHang).catch(() => {});
  }, [goi]);

  // Từ hồ sơ khách bấm "Bán tiếp": chọn sẵn khách (mỗi lần tham số đổi)
  const [thamSo, setThamSo] = useState('');
  const khoaTS = p.ma && p.ten ? p.ma + '|' + p.ten : '';
  if (khoaTS && khoaTS !== thamSo) { setThamSo(khoaTS); setKhach({ MaKH: p.ma!, TenKH: p.ten! }); setKq(null); }

  const tong = useMemo(() => tongGio(gio, vat), [gio, vat]);
  const thu = soThu ?? tong.tong; // chưa sửa thì khách trả đủ

  const themTheoMa = async (raw: string) => {
    const ma = chuanHoaMa(raw);
    setLoiMa(''); setMaChuaCo('');
    if (ma.length < 4) return setLoiMa('Nhập IMEI/serial (ít nhất 4 ký tự).');
    if (gio.some(l => l.IMEI === ma)) return setLoiMa(`Máy ${ma} đã có trong đơn.`);
    setDangTraMa(true);
    try {
      const r = await goi<MaKho>('traMaKho', ma);
      if (r.trangThai === 'daBan') return setLoiMa(`Máy ${r.ma} đã bán ngày ${ngay(r.Ngay)}${r.DoiTac ? ' cho ' + r.DoiTac : ''}${r.SoDH ? ' (đơn ' + r.SoDH + ')' : ''}.`);
      if (r.trangThai === 'chuaCo') { setMaChuaCo(r.ma); setChonHang(true); return; }
      setGio(g => themMay(g, { MaHH: r.MaHH!, TenHang: r.TenHang!, DVT: r.DVT, GiaLe: r.GiaLe }, r.ma));
      setMaGo('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) { setLoiMa((e as Error).message); } finally { setDangTraMa(false); }
  };

  const coMa = (raw: string, tu: 'camera' | 'anh' | 'dan') => {
    if (tu === 'camera') { // camera gọi liên tục khi mã còn trong khung: bỏ qua mã vừa quét trong 3 giây và khi đang tra
      const ma = chuanHoaMa(raw), t = Date.now();
      if (dangTraMa || (ma === daQuet.current.ma && t - daQuet.current.luc < 3000)) return;
      daQuet.current = { ma, luc: t };
    }
    if (tu !== 'camera') setMaGo(chuanHoaMa(raw));
    themTheoMa(raw);
  };

  const chon = (h: HangKho | { MaHH: ''; TenHang: string; GiaLe: number }) => {
    try {
      setGio(g => (maChuaCo ? themMay(g, h, maChuaCo) : themHang(g, h)));
      if (maChuaCo) { setMaChuaCo(''); setMaGo(''); }
      setChonHang(false); setLoiMa('');
    } catch (e) { setLoiMa((e as Error).message); }
  };

  const ban = async () => {
    setLoi('');
    if (!gio.length) return setLoi('Chưa có hàng nào trong đơn.');
    if (!khach) return setLoi('Chọn khách (hoặc bấm Khách lẻ).');
    if (thu > tong.tong) return setLoi('Số tiền khách trả lớn hơn tổng đơn.');
    const ten = khach.TenKH, cau = `${tong.soMay} sản phẩm, tổng ${tien(tong.tong)}.\nKhách trả ${tien(thu)}${thu ? ' (' + hinhThuc + ')' : ''}${thu < tong.tong ? ', còn nợ ' + tien(tong.tong - thu) : ''}.`;
    if (!(await hoi(`Bán cho ${ten}?`, cau, 'Bán'))) return;
    setDangLuu(true);
    try {
      const r = await goi<BanNhanhKQ>('banNhanh', {
        ...('moi' in khach ? { khachMoi: { TenKH: khach.TenKH, SDT: khach.SDT } } : { MaKH: khach.MaKH }),
        lines: dongGui(gio), VAT: vat, GhiChu: ghiChu.trim(), thu: { SoTien: thu, HinhThuc: hinhThuc },
      });
      setKq(r);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      goi<HangKho[]>('khoMay').then(setHang).catch(() => {}); // tồn kho mới
    } catch (e) { setLoi((e as Error).message); } finally { setDangLuu(false); }
  };

  const donMoi = () => {
    setGio([]); setKhach(null); setSoThu(null); setGhiChu(''); setKq(null); setLoi(''); setLoiMa(''); setMaGo(''); setMaChuaCo('');
    setVat(ch?.vat ?? 0); router.setParams({ ma: undefined, ten: undefined });
  };

  if (kq) return <KetQua kq={kq} qr={ch?.qr ?? null} hinhThuc={hinhThuc} onMoi={donMoi} />;

  const goiY = maGo ? goiYMa(chuanHoaMa(maGo)) : '';
  return (
    <KhungTrang>
      <Text style={s.tieuDe} testID="tieu-de-ban">Bán nhanh</Text>
      <Text style={s.phu}>Quét IMEI là biết máy nào, giá bao nhiêu. Bấm Bán: app tự lập đơn, xuất kho và ghi tiền đã thu.</Text>

      {/* 1. Hàng */}
      <The nhan="1 · Hàng bán" style={s.muc} testID="the-hang">
        <View style={s.hangNhap}>
          <TextInput style={s.o} value={maGo} onChangeText={setMaGo} placeholder="Gõ IMEI / serial" placeholderTextColor={mau.xam} autoCapitalize="characters"
            autoCorrect={false} returnKeyType="done" onSubmitEditing={() => themTheoMa(maGo)} testID="o-imei-ban" />
          <Pressable onPress={() => { Keyboard.dismiss(); themTheoMa(maGo); }} style={s.nutVuong} accessibilityLabel="Thêm máy" testID="nut-them-imei" disabled={dangTraMa}>
            <Ionicons name={dangTraMa ? 'hourglass-outline' : 'add'} size={24} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setCamera(!camera)} style={[s.nutVuong, { backgroundColor: camera ? mau.chu : mau.brand }]} accessibilityLabel={camera ? 'Tắt camera' : 'Quét bằng camera'} testID="nut-camera">
            <Ionicons name={camera ? 'close' : 'scan'} size={22} color="#fff" />
          </Pressable>
        </View>
        {goiY ? <Text style={s.goiY}>{goiY}</Text> : null}
        <View style={{ marginTop: camera ? 12 : 0 }}>
          <KhungQuet bat={camera && focus} onMa={coMa} onLoi={setLoiMa} cao={220} huongDan="Quét lần lượt từng máy" />
        </View>
        <ChuLoi chu={loiMa} testID="loi-imei" />
        {maChuaCo ? <Text style={s.goiY} testID="ma-chua-co">Máy {maChuaCo} chưa có trong phiếu nhập kho. Chọn mặt hàng của máy này:</Text> : null}

        {gio.length ? <Vach /> : null}
        {gio.map(l => <DongHang key={l.k} l={l} setGio={setGio} />)}

        <Nut chu={chonHang && !maChuaCo ? 'Đóng danh sách hàng' : 'Thêm phụ kiện / dịch vụ'} phu bieuTuong={chonHang && !maChuaCo ? 'close' : 'add-circle-outline'}
          onPress={() => { setChonHang(!chonHang || !!maChuaCo); setMaChuaCo(''); }} style={{ marginTop: 12, minHeight: 46 }} testID="nut-them-hang" />
        {chonHang ? <ChonHang hang={hang} onChon={chon} choMay={!!maChuaCo} /> : null}
      </The>

      {/* 2. Khách */}
      <The nhan="2 · Khách" style={s.muc} testID="the-khach">
        <ChonKhach khach={khach} setKhach={setKhach} />
      </The>

      {/* 3. Thanh toán */}
      <The nhan="3 · Thanh toán" style={s.muc} testID="the-thanh-toan">
        <View style={s.dongTien}><Text style={s.nhanTien}>Tiền hàng</Text><Text style={s.giaTri}>{tien(tong.tienHang)}</Text></View>
        <View style={s.dongTien}>
          <Text style={s.nhanTien}>VAT</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 8, 10].map(v => <Chip key={v} chu={v + '%'} chon={vat === v} onPress={() => setVat(v)} testID={'vat-' + v} />)}
          </View>
        </View>
        <View style={s.dongTien}><Text style={[s.nhanTien, { fontWeight: '800', color: mau.chu }]}>Tổng cộng</Text><Text style={s.tong} testID="tong-cong">{tien(tong.tong)}</Text></View>
        <Vach />
        <Text style={[s.nhanTien, { marginTop: 12 }]}>Khách trả</Text>
        <View style={s.hangNhap}>
          <TextInput style={[s.o, { fontWeight: '800' }]} value={soTienNhap(thu)} onChangeText={t => setSoThu(docTien(t))} keyboardType="number-pad"
            placeholder="0" placeholderTextColor={mau.xam} testID="o-khach-tra" />
          <Chip chu="Đủ" chon={soThu === null} onPress={() => setSoThu(null)} testID="tra-du" />
          <Chip chu="Nợ hết" chon={soThu === 0} onPress={() => setSoThu(0)} testID="no-het" />
        </View>
        {thu < tong.tong ? <Text style={s.goiY} testID="con-no">Khách còn nợ {tien(tong.tong - thu)}</Text> : null}
        {thu > tong.tong ? <ChuLoi chu="Số tiền khách trả lớn hơn tổng đơn." /> : null}
        {thu > 0 ? (
          <View style={s.chips}>
            {(ch?.hinhThuc ?? ['Tiền mặt', 'Chuyển khoản']).map(h => <Chip key={h} chu={h} chon={hinhThuc === h} onPress={() => setHinhThuc(h)} testID={'ht-' + boDau(h).replace(/\s+/g, '-')} />)}
          </View>
        ) : null}
        {thu > 0 && /chuyen khoan/.test(boDau(hinhThuc)) ? <MaQR qr={ch?.qr ?? null} soTien={thu} noiDung={`${khach?.TenKH ?? ''} mua hang`} /> : null}
        <TextInput style={[s.o, { marginTop: 12, flex: 0 }]} value={ghiChu} onChangeText={setGhiChu} placeholder="Ghi chú (không bắt buộc)" placeholderTextColor={mau.xam} />
      </The>

      <ChuLoi chu={loi} testID="loi-ban" />
      <Nut chu={gio.length ? `Bán · ${tien(tong.tong)}` : 'Bán'} bieuTuong="checkmark-circle" onPress={ban} dangChay={dangLuu} style={{ marginTop: 12 }} testID="nut-ban" />
      {gio.length ? <Nut chu="Xóa đơn đang soạn" phu nguyHiem onPress={async () => { if (await hoi('Xóa đơn đang soạn?', 'Bỏ hết hàng và khách đã chọn.', 'Xóa')) donMoi(); }} style={{ marginTop: 10, minHeight: 46 }} /> : null}
    </KhungTrang>
  );
}

function DongHang({ l, setGio }: { l: DongGio; setGio: React.Dispatch<React.SetStateAction<DongGio[]>> }) {
  return (
    <View style={s.dongHang} testID="dong-gio">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.tenHang}>{l.TenHang}</Text>
          {l.IMEI ? <Text style={s.imei}>IMEI {l.IMEI}</Text> : null}
        </View>
        <Pressable onPress={() => setGio(g => xoaDong(g, l.k))} hitSlop={10} accessibilityLabel={'Bỏ ' + l.TenHang} testID="nut-bo-dong">
          <Ionicons name="trash-outline" size={20} color={mau.do} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <TextInput style={[s.o, s.oGia]} value={soTienNhap(l.DonGia)} onChangeText={t => setGio(g => suaGia(g, l.k, docTien(t)))} keyboardType="number-pad"
          placeholder="Giá" placeholderTextColor={mau.xam} accessibilityLabel={'Giá ' + l.TenHang} testID="o-gia" />
        {l.IMEI ? <Text style={s.sl}>1 {l.DVT || 'máy'}</Text> : (
          <View style={s.buoc}>
            <Pressable onPress={() => setGio(g => doiSoLuong(g, l.k, l.SoLuong - 1))} style={s.nutBuoc} accessibilityLabel="Bớt"><Ionicons name="remove" size={18} color={mau.chu} /></Pressable>
            <Text style={s.sl} testID="so-luong">{l.SoLuong}</Text>
            <Pressable onPress={() => setGio(g => doiSoLuong(g, l.k, l.SoLuong + 1))} style={s.nutBuoc} accessibilityLabel="Thêm" testID="nut-tang"><Ionicons name="add" size={18} color={mau.chu} /></Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function ChonHang({ hang, onChon, choMay }: { hang: HangKho[] | null; onChon: (h: HangKho | { MaHH: ''; TenHang: string; GiaLe: number }) => void; choMay: boolean }) {
  const [q, setQ] = useState(''), [gia, setGia] = useState(0);
  const ds = useMemo(() => {
    const w = boDau(q).split(/\s+/).filter(Boolean);
    return (hang ?? []).filter(h => w.every(x => boDau(h.TenHang + ' ' + h.MaHH + ' ' + h.Model).includes(x))).slice(0, 30);
  }, [hang, q]);
  return (
    <View style={{ marginTop: 12 }} testID="chon-hang">
      <OTim value={q} onChangeText={setQ} placeholder="Tìm hàng theo tên" testID="o-tim-hang" />
      {!hang ? <ChuNhat chu="Đang tải danh sách hàng…" /> : null}
      {ds.map((h, i) => (
        <View key={h.MaHH}>
          {i ? <Vach /> : null}
          <Dong chinh={h.TenHang} phu={`Tồn ${h.ton} ${h.DVT || ''}`.trim()} ben={h.GiaLe ? tien(h.GiaLe) : 'Chưa có giá'} onPress={() => onChon(h)} testID={'hang-' + h.MaHH} />
        </View>
      ))}
      {!choMay && q.trim() && !ds.length ? (
        <View style={{ marginTop: 10 }}>
          <ChuNhat chu={`Không có "${q.trim()}" trong danh mục. Thêm như dịch vụ / hàng ngoài danh mục:`} />
          <View style={[s.hangNhap, { marginTop: 8 }]}>
            <TextInput style={s.o} value={soTienNhap(gia)} onChangeText={t => setGia(docTien(t))} keyboardType="number-pad" placeholder="Giá" placeholderTextColor={mau.xam} testID="o-gia-dv" />
            <Nut chu="Thêm" bieuTuong="add" onPress={() => onChon({ MaHH: '', TenHang: q.trim(), GiaLe: gia })} style={{ minHeight: 48 }} testID="nut-them-dv" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ChonKhach({ khach, setKhach }: { khach: Khach | null; setKhach: (k: Khach | null) => void }) {
  const { goi } = useAuth();
  const [q, setQ] = useState(''), [sdt, setSdt] = useState(''), [kq, setKq] = useState<KhachTom[]>([]), [loi, setLoi] = useState('');
  const ds = khach || q.trim().length < 2 ? [] : kq;
  useEffect(() => {
    if (khach || q.trim().length < 2) return;
    let bo = false;
    const t = setTimeout(() => goi<DsKhach>('dsKhachMay', q.trim()).then(r => { if (!bo) setKq(r.ds.slice(0, 6)); }).catch(e => { if (!bo) setLoi((e as Error).message); }), 300);
    return () => { bo = true; clearTimeout(t); };
  }, [q, khach, goi]);

  if (khach) {
    return (
      <View style={s.khachChon} testID="khach-da-chon">
        <View style={{ flex: 1 }}>
          <Text style={s.tenHang}>{khach.TenKH}</Text>
          <Text style={s.imei}>{'moi' in khach ? 'Khách mới' + (khach.SDT ? ' · ' + khach.SDT : '') : [khach.MaKH, khach.SDT].filter(Boolean).join(' · ')}</Text>
        </View>
        <Pressable onPress={() => setKhach(null)} hitSlop={10} accessibilityLabel="Đổi khách" testID="nut-doi-khach"><Text style={s.lienKet}>Đổi</Text></Pressable>
      </View>
    );
  }
  const laSo = /^[\d\s.+-]+$/.test(q.trim());
  return (
    <View>
      <OTim value={q} onChangeText={setQ} placeholder="Tìm tên / SĐT, hoặc gõ tên khách mới" testID="o-tim-khach-ban" />
      <ChuLoi chu={loi} />
      {ds.map((k, i) => (
        <View key={k.MaKH}>
          {i ? <Vach /> : null}
          <Dong chinh={k.TenKH} phu={[k.SDT, k.MaKH].filter(Boolean).join(' · ')} ben={k.no > 0 ? 'nợ ' + tien(k.no) : undefined} benMau={mau.vang}
            onPress={() => setKhach({ MaKH: k.MaKH, TenKH: k.TenKH, SDT: k.SDT })} testID={'chon-khach-' + k.MaKH} />
        </View>
      ))}
      {q.trim().length >= 2 && !laSo ? (
        <View style={{ marginTop: 10 }}>
          <TextInput style={[s.o, { flex: 0 }]} value={sdt} onChangeText={setSdt} placeholder={`Số điện thoại của ${q.trim()}`} placeholderTextColor={mau.xam} keyboardType="phone-pad" testID="o-sdt-khach-moi" />
          <Nut chu={`Khách mới: ${q.trim()}`} phu bieuTuong="person-add-outline" onPress={() => setKhach({ moi: true, TenKH: q.trim(), SDT: sdt.trim() })} style={{ marginTop: 10, minHeight: 46 }} testID="nut-khach-moi" />
        </View>
      ) : null}
      <Nut chu="Khách lẻ (không lưu tên)" phu bieuTuong="walk-outline" onPress={() => setKhach({ moi: true, TenKH: 'Khách lẻ', SDT: '' })} style={{ marginTop: 10, minHeight: 46 }} testID="nut-khach-le" />
    </View>
  );
}

function KetQua({ kq, qr, hinhThuc, onMoi }: { kq: BanNhanhKQ; qr: CauHinh['qr']; hinhThuc: string; onMoi: () => void }) {
  const no = kq.TongCong - kq.daThu;
  return (
    <KhungTrang>
      <View style={s.xong}><Ionicons name="checkmark-circle" size={64} color={mau.xanh} /></View>
      <Text style={[s.tieuDe, { textAlign: 'center' }]} testID="da-ban">Đã bán</Text>
      <Text style={[s.phu, { textAlign: 'center' }]}>{kq.TenKH} · {tien(kq.TongCong)}</Text>
      <The style={s.muc} testID="ket-qua-ban">
        <DongTT nhan="Đơn hàng" giaTri={kq.SoDH} dam />
        <DongTT nhan="Phiếu xuất" giaTri={kq.SoPK} />
        <DongTT nhan="Phiếu thu" giaTri={kq.SoPT ? `${kq.SoPT} · ${tien(kq.daThu)}` : 'Chưa thu'} />
        {no > 0 ? <DongTT nhan="Còn nợ" giaTri={tien(no)} dam /> : null}
      </The>
      {kq.loiThu ? <The nhan="Chưa ghi được tiền thu" mauNhan={mau.do} style={s.muc}><Text style={s.phu}>{kq.loiThu} Đơn và phiếu xuất đã lưu; bấm Thu tiền để ghi lại.</Text></The> : null}
      {kq.daThu > 0 && /chuyen khoan/.test(boDau(hinhThuc)) && qr ? <The nhan="Mã QR chuyển khoản" style={s.muc}><MaQR qr={qr} soTien={kq.daThu} noiDung={kq.SoDH} /></The> : null}
      <TieuDeMuc chu="Hàng đã giao" />
      <The style={s.muc}>
        {kq.lines.map((l, i) => (
          <View key={i}>
            {i ? <Vach /> : null}
            <Dong chinh={`${l.TenHang}${l.SoLuong > 1 ? ' × ' + l.SoLuong : ''}`} phu={l.IMEI ? 'IMEI ' + l.IMEI : undefined}
              ben={l.HetHan ? 'BH đến ' + ngay(l.HetHan) : undefined} benMau={mau.xanh} />
          </View>
        ))}
      </The>
      {no > 0 ? <Nut chu={`Thu tiền · còn ${tien(no)}`} bieuTuong="wallet" onPress={() => router.push({ pathname: '/thu-tien', params: { ma: kq.MaKH, don: kq.SoDH } })} style={{ marginBottom: 10 }} testID="nut-thu-sau-ban" /> : null}
      <Nut chu="Bán đơn mới" bieuTuong="bag-add" phu={no > 0} onPress={onMoi} testID="nut-ban-moi" />
      <Nut chu="Xem khách" phu bieuTuong="person-outline" onPress={() => router.push({ pathname: '/khach/[ma]', params: { ma: kq.MaKH } })} style={{ marginTop: 10 }} testID="nut-xem-khach" />
      <View style={{ alignItems: 'center', marginTop: 14 }}><Nhan chu="Đã lưu lên Google Sheet" loai="xanh" /></View>
    </KhungTrang>
  );
}

const s = StyleSheet.create({
  tieuDe: { fontSize: 30, fontWeight: '800', color: mau.chu, letterSpacing: -0.5, marginTop: 6 },
  phu: { fontSize: 15, color: mau.chuPhu, marginTop: 4, marginBottom: 16, lineHeight: 21 },
  muc: { marginBottom: 14 },
  hangNhap: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  o: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: mau.chu },
  nutVuong: { width: 50, height: 50, borderRadius: 14, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
  goiY: { color: mau.vang, fontSize: 14, marginTop: 10, fontWeight: '600', lineHeight: 19 },
  dongHang: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: mau.vach },
  tenHang: { fontSize: 16, fontWeight: '700', color: mau.chu },
  imei: { fontSize: 13, color: mau.chuNhat, marginTop: 2, fontVariant: ['tabular-nums'] },
  oGia: { paddingVertical: 9, fontSize: 16, fontWeight: '700' },
  sl: { fontSize: 16, fontWeight: '800', color: mau.chu, minWidth: 28, textAlign: 'center' },
  buoc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nutBuoc: { width: 36, height: 36, borderRadius: 18, backgroundColor: mau.xamNhat, alignItems: 'center', justifyContent: 'center' },
  khachChon: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lienKet: { fontSize: 16, color: mau.camDam, fontWeight: '700' },
  dongTien: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  nhanTien: { fontSize: 15, color: mau.chuPhu, fontWeight: '600' },
  giaTri: { fontSize: 16, fontWeight: '700', color: mau.chu },
  tong: { fontSize: 22, fontWeight: '800', color: mau.camDam },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  xong: { alignItems: 'center', marginTop: 20 },
});
