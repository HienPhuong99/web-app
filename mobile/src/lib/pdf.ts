// Tải PDF hợp đồng từ máy chủ (taiPdfHopDong) rồi mở bảng chia sẻ. dang = số hợp đồng đang tải.
import { useCallback, useState } from 'react';
import { useAuth } from './auth';
import { chiaSePdf } from './chiaSe';

export function useTaiPdf() {
  const { goi } = useAuth();
  const [dang, setDang] = useState(''), [loi, setLoi] = useState('');
  const tai = useCallback(async (soHD: string) => {
    setDang(soHD); setLoi('');
    try {
      const f = await goi<{ ten: string; base64: string }>('taiPdfHopDong', soHD);
      await chiaSePdf(f.ten, f.base64);
    } catch (e) { setLoi((e as Error).message); } finally { setDang(''); }
  }, [goi]);
  return { dang, loi, tai };
}

/** Phiếu bán hàng của một đơn (hàng, IMEI, hạn bảo hành, đã trả, còn nợ) dạng PDF: mở bảng chia sẻ để gửi khách qua Zalo, Messenger… */
export function useGuiPhieu() {
  const { goi } = useAuth();
  const [dang, setDang] = useState(''), [loi, setLoi] = useState('');
  const gui = useCallback(async (soDH: string) => {
    setDang(soDH); setLoi('');
    try {
      const f = await goi<{ ten: string; base64: string }>('phieuBanHangPdf', soDH);
      await chiaSePdf(f.ten, f.base64);
    } catch (e) { setLoi((e as Error).message); } finally { setDang(''); }
  }, [goi]);
  return { dang, loi, gui };
}

/** Phiếu nhận máy bảo hành – sửa chữa (PDF) để gửi khách qua Zalo…: mở bảng chia sẻ */
export function useGuiPhieuSua() {
  const { goi } = useAuth();
  const [dang, setDang] = useState(''), [loi, setLoi] = useState('');
  const gui = useCallback(async (soPN: string) => {
    setDang(soPN); setLoi('');
    try {
      const f = await goi<{ ten: string; base64: string }>('phieuNhanMayPdf', soPN);
      await chiaSePdf(f.ten, f.base64);
    } catch (e) { setLoi((e as Error).message); } finally { setDang(''); }
  }, [goi]);
  return { dang, loi, gui };
}
