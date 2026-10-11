// Hợp đồng: tìm theo số / tên / SĐT, lọc theo trạng thái / hạn, sắp xếp; hợp đồng đã có file thì bấm để tải PDF và chia sẻ (Zalo, Mail…). Lập / sửa hợp đồng làm trên web.
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { useAuth } from '../lib/auth';
import type { HopDongTom } from '../lib/api';
import { ngay, tien } from '../lib/dinhDang';
import { LOC_HD, SX_HD, moTaSx, nhanCua, sxMacDinh, type LocHD, type SxHD } from '../lib/locDs';
import { useTaiPdf } from '../lib/pdf';
import { BoLoc, BoSapXep } from '../ui/BoLoc';
import { ChuLoi, ChuNhat, Dong, KhungTrang, OTim, Vach } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { The } from '../ui/The';
import { mau } from '../ui/theme';

export default function HopDongMan() {
  const { goi } = useAuth();
  const [q, setQ] = useState(''), [kq, setKq] = useState<{ tong: number; ds: HopDongTom[] } | null>(null), [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const [loc, setLoc] = useState<LocHD>('tat'), [sx, setSx] = useState<SxHD>(sxMacDinh(SX_HD));
  const pdf = useTaiPdf(), lan = useRef(0);

  const tai = useCallback(async (tu: string) => {
    const so = ++lan.current;
    setDangTai(true);
    try { const r = await goi<{ tong: number; ds: HopDongTom[] }>('dsHopDongMay', tu, { loc, sx: sx.theo, chieu: sx.chieu }); if (so === lan.current) { setKq(r); setLoi(''); } }
    catch (e) { if (so === lan.current) setLoi((e as Error).message); }
    finally { if (so === lan.current) setDangTai(false); }
  }, [goi, loc, sx]);
  useEffect(() => { const t = setTimeout(() => tai(q.trim()), q ? 350 : 0); return () => clearTimeout(t); }, [q, tai]);

  return (
    <KhungTrang coTab={false} refreshControl={<RefreshControl refreshing={dangTai && !!kq} onRefresh={() => tai(q.trim())} tintColor={mau.cam} />}>
      <DauTrang tieuDe="Hợp đồng" phu="Bấm hợp đồng đã có file để tải PDF và gửi cho khách. Lập, sửa, tạo file hợp đồng làm trên web." />
      <OTim value={q} onChangeText={setQ} placeholder="Số hợp đồng, tên bên A, số điện thoại" testID="o-tim-hd" />
      <BoLoc ds={LOC_HD} chon={loc} onChon={setLoc} testID="loc-hd" />
      <BoSapXep ds={SX_HD} chon={sx} onChon={setSx} testID="sx-hd" />
      <ChuLoi chu={loi || pdf.loi} testID="loi-hd" />
      {!kq && !loi ? <ChuNhat chu="Đang tải…" /> : null}
      {kq ? (
        <The style={{ marginTop: 14, paddingVertical: 6 }} testID="ds-hd">
          {!kq.ds.length ? <ChuNhat chu={q ? `Không có hợp đồng nào khớp "${q.trim()}".` : loc !== 'tat' ? `Không có hợp đồng nào ở mục "${nhanCua(LOC_HD, loc)}".` : 'Chưa có hợp đồng.'} style={{ marginVertical: 10 }} /> : null}
          {kq.ds.map((h, i) => (
            <View key={h.SoHD}>
              {i ? <Vach /> : null}
              <Dong chinh={`${h.SoHD} · ${h.TenDN}`} phu={[h.LoaiHD, ngay(h.Ngay), h.TongCong ? tien(h.TongCong) : '', h.NgayHetHan && 'hết hạn ' + ngay(h.NgayHetHan)].filter(Boolean).join(' · ')}
                ben={!h.coFile ? 'Chưa có file' : pdf.dang === h.SoHD ? 'Đang tải…' : 'Chia sẻ PDF'} benMau={h.coFile ? mau.brand : mau.xam}
                benPhu={h.coFile && h.fileCu ? 'file cũ hơn bản sửa' : undefined}
                onPress={h.coFile ? () => pdf.tai(h.SoHD) : undefined} bieuTuong="document-text-outline" testID={'hd-' + h.SoHD} />
            </View>
          ))}
        </The>
      ) : null}
      {kq && kq.tong > kq.ds.length ? <ChuNhat chu={`Hiện ${kq.ds.length} / ${kq.tong} hợp đồng (${moTaSx(SX_HD, sx)}). Gõ để tìm.`} /> : null}
    </KhungTrang>
  );
}
