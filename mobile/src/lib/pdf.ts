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
