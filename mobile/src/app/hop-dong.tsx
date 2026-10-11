// Hợp đồng: tìm theo số / tên / SĐT, lọc theo trạng thái / hạn, sắp xếp; hợp đồng đã có file thì bấm để tải PDF và chia sẻ (Zalo, Mail…). Lập / sửa hợp đồng làm trên web.
import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import type { HopDongTom } from '../lib/api';
import { ngay, tien } from '../lib/dinhDang';
import { LOC_HD, SX_HD, moTaSx, nhanCua, sxMacDinh, type LocHD, type SxHD } from '../lib/locDs';
import { useTaiPdf } from '../lib/pdf';
import { useDuLieu } from '../lib/useDuLieu';
import { BoLoc, BoSapXep } from '../ui/BoLoc';
import { ChuLoi, ChuNhat, Dong, KhungDanhSach, OTim } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { DongCapNhat, KhungCho, useKeo } from '../ui/TrangThaiTai';
import { mau } from '../ui/theme';

export default function HopDongMan() {
  const [q, setQ] = useState(''), [tu, setTu] = useState('');
  const [loc, setLoc] = useState<LocHD>('tat'), [sx, setSx] = useState<SxHD>(sxMacDinh(SX_HD));
  const pdf = useTaiPdf();
  useEffect(() => { const t = setTimeout(() => setTu(q.trim()), q ? 350 : 0); return () => clearTimeout(t); }, [q]);
  const dl = useDuLieu<{ tong: number; ds: HopDongTom[] }>('dsHopDongMay', [tu, { loc, sx: sx.theo, chieu: sx.chieu }], { luuMay: !tu, giuCu: true }), kq = dl.du, keo = useKeo(dl.lamMoi);

  return (
    <KhungDanhSach coTab={false} refreshControl={<RefreshControl {...keo} />} testID="ds-hd"
      dau={
        <View style={{ marginBottom: 14 }}>
          <DauTrang tieuDe="Hợp đồng" phu="Bấm hợp đồng đã có file để tải PDF và gửi cho khách. Lập, sửa, tạo file hợp đồng làm trên web." />
          <DongCapNhat dl={dl} />
          <OTim value={q} onChangeText={setQ} placeholder="Số hợp đồng, tên bên A, số điện thoại" testID="o-tim-hd" />
          <BoLoc ds={LOC_HD} chon={loc} onChon={setLoc} testID="loc-hd" />
          <BoSapXep ds={SX_HD} chon={sx} onChon={setSx} testID="sx-hd" />
          <ChuLoi chu={(!kq ? dl.loi : '') || pdf.loi} testID="loi-hd" />
        </View>
      }
      ds={kq ? kq.ds : null} khoa={h => h.SoHD} choTai={dl.loi ? null : <KhungCho dong={5} tron />}
      rong={tu ? `Không có hợp đồng nào khớp "${tu}".` : loc !== 'tat' ? `Không có hợp đồng nào ở mục "${nhanCua(LOC_HD, loc)}".` : 'Chưa có hợp đồng.'}
      ve={h => (
        <Dong chinh={`${h.SoHD} · ${h.TenDN}`} phu={[h.LoaiHD, ngay(h.Ngay), h.TongCong ? tien(h.TongCong) : '', h.NgayHetHan && 'hết hạn ' + ngay(h.NgayHetHan)].filter(Boolean).join(' · ')}
          ben={!h.coFile ? 'Chưa có file' : pdf.dang === h.SoHD ? 'Đang tải…' : 'Chia sẻ PDF'} benMau={h.coFile ? mau.brand : mau.xam}
          benPhu={h.coFile && h.fileCu ? 'file cũ hơn bản sửa' : undefined}
          onPress={h.coFile ? () => pdf.tai(h.SoHD) : undefined} bieuTuong="document-text-outline" testID={'hd-' + h.SoHD} />
      )}
      cuoi={kq && kq.tong > kq.ds.length ? <ChuNhat chu={`Hiện ${kq.ds.length} / ${kq.tong} hợp đồng (${moTaSx(SX_HD, sx)}). Gõ để tìm.`} /> : null}
    />
  );
}
