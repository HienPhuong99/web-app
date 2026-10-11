// Bảo hành – sửa chữa: các phiếu nhận máy (chưa trả khách / đến hẹn / sửa xong chờ lấy / đã trả), tìm theo khách, SĐT, máy, IMEI; nút nhận máy mới.
import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import type { PhieuSua } from '../lib/api';
import { ngay } from '../lib/dinhDang';
import { nhanCua, type LuaChon } from '../lib/locDs';
import { MAU_SUA, maDuongDan, moTaHen } from '../lib/phieuSua';
import { useDuLieu } from '../lib/useDuLieu';
import { BoLoc } from '../ui/BoLoc';
import { ChuLoi, Dong, KhungDanhSach, OTim } from '../ui/DanhSach';
import { DauTrang } from '../ui/DauTrang';
import { Nut } from '../ui/Nut';
import { DongCapNhat, KhungCho, useKeo } from '../ui/TrangThaiTai';
import { mau } from '../ui/theme';

type LocSua = 'dang' | 'hen' | 'xong' | 'tra' | 'tat';
const LOC_SUA: LuaChon<LocSua> = [['dang', 'Chưa trả'], ['hen', 'Đến hẹn'], ['xong', 'Xong, chờ lấy'], ['tra', 'Đã trả'], ['tat', 'Tất cả']];

export default function SuaChuaMan() {
  const [q, setQ] = useState(''), [tu, setTu] = useState(''), [loc, setLoc] = useState<LocSua>('dang');
  useEffect(() => { const t = setTimeout(() => setTu(q.trim()), q ? 350 : 0); return () => clearTimeout(t); }, [q]);
  const dl = useDuLieu<{ tong: number; ds: PhieuSua[] }>('dsSuaChua', [tu, { loc }], { luuMay: !tu, giuCu: true }), kq = dl.du, keo = useKeo(dl.lamMoi);
  return (
    <KhungDanhSach coTab={false} refreshControl={<RefreshControl {...keo} />} testID="ds-sua"
      dau={
        <View style={{ marginBottom: 14 }}>
          <DauTrang tieuDe="Bảo hành – sửa chữa" phu="Phiếu nhận máy của khách: lỗi, hẹn trả, trạng thái. Trả máy có phí thì app tự lập đơn dịch vụ." />
          <DongCapNhat dl={dl} />
          <Nut chu="Nhận máy" bieuTuong="add-circle-outline" onPress={() => router.push({ pathname: '/sua-chua/[so]', params: { so: 'moi' } })} style={{ marginBottom: 12 }} testID="nut-nhan-may" />
          <OTim value={q} onChangeText={setQ} placeholder="Khách, SĐT, tên máy, IMEI, số phiếu" testID="o-tim-sua" />
          <BoLoc ds={LOC_SUA} chon={loc} onChon={setLoc} testID="loc-sua" />
          {!kq ? <ChuLoi chu={dl.loi} /> : null}
        </View>
      }
      ds={kq ? kq.ds : null} khoa={p => p.SoPN} choTai={dl.loi ? null : <KhungCho dong={5} tron />}
      rong={tu ? `Không có phiếu nào khớp "${tu}".` : `Không có phiếu nào ở mục "${nhanCua(LOC_SUA, loc)}".`}
      ve={p => (
        <Dong chinh={`${p.TenKH} · ${p.TenMay || p.IMEI}`} phu={[p.SoPN, p.TinhTrang, p.TrangThai === 'Đã trả khách' ? 'trả ' + ngay(p.NgayTra) : moTaHen(p)].filter(Boolean).join(' · ')}
          ben={p.TrangThai} benMau={MAU_SUA[p.TrangThai] ?? mau.chu} benPhu={p.Loai} bieuTuong={p.Loai === 'Bảo hành' ? 'shield-checkmark-outline' : 'construct-outline'}
          mauBT={p.conNgay !== null && p.conNgay < 0 ? mau.do : mau.brand}
          onPress={() => router.push({ pathname: '/sua-chua/[so]', params: { so: maDuongDan(p.SoPN) } })} testID={'sua-' + p.SoPN} />
      )}
    />
  );
}
