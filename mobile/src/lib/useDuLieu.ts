// Lấy dữ liệu cho một màn hình theo kiểu "hiện số cũ ngay, cập nhật ở nền":
// có số đã nhớ (lần trước, kể cả lần mở app trước) thì hiện luôn, đồng thời hỏi máy chủ; có số mới thì màn hình tự thay.
// Mỗi lần màn hình được mở lại (quay lại từ màn khác) cũng hỏi lại. Kéo xuống: lamMoi() bắt máy chủ tính lại, không dùng kết quả ghi nhớ.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from './auth';
import { khoaCua, layLuu, layNgay, luu, nghe, sua, suaNhieu, type Muc } from './boNho';

type TuyChon = {
  /** false: chỉ nhớ trong lần chạy app này, không ghi ra máy (vd. kết quả tìm theo chữ gõ) */
  luuMay?: boolean;
  /** false: chưa gọi máy chủ (vd. chưa đủ điều kiện) */
  bat?: boolean;
  /** true: đổi tham số (gõ tìm, đổi lọc) mà chưa có số đã nhớ thì vẫn hiện số cũ tới khi có số mới, không nháy trống */
  giuCu?: boolean;
};

export type DuLieu<T> = {
  du: T | null;
  /** lúc lấy số đang hiện (ms), null khi chưa có */
  luc: number | null;
  loi: string;
  dangTai: boolean;
  tai: () => Promise<void>;
  lamMoi: () => Promise<void>;
};

/** Khóa bộ nhớ của một lần gọi, theo tài khoản + máy chủ đang dùng (để sua() sau khi ghi) */
export function useKhoaBoNho() {
  const { user, mayChu } = useAuth();
  return useCallback((fn: string, ...args: unknown[]) => (user ? khoaCua(user.u + '@' + mayChu, fn, args) : ''), [user, mayChu]);
}

/**
 * Sửa số đã nhớ ngay sau khi ghi thành công (bán, thu tiền…) để các màn hình khác hiện đúng tức thì, không chờ tải lại.
 * mot(fn, args, f): một mục; moi(fn, f): mọi mục của hàm đó (vd. mọi danh sách khách đã lọc / tìm).
 */
export function useSuaBoNho() {
  const taoKhoa = useKhoaBoNho();
  return useMemo(() => ({
    mot: <T,>(fn: string, args: unknown[], f: (du: T) => T) => { const k = taoKhoa(fn, ...args); if (k) sua<T>(k, f); },
    moi: <T,>(fn: string, f: (du: T) => T) => {
      const dau = taoKhoa(fn).slice(0, -2); // 'u@máy chủ|fn|[]' → 'u@máy chủ|fn|'
      if (dau) suaNhieu<T>(k => k.startsWith(dau), f);
    },
  }), [taoKhoa]);
}

/**
 * Mở app (đã đăng nhập): lấy sẵn ở nền những gì hay mở ngay sau Tổng quan (kho, danh sách khách, cài đặt bán hàng),
 * từng cái một để không tranh với Tổng quan. Mục vừa lấy trong vòng 5 phút thì bỏ qua.
 */
export function useTaiTruoc(ds: [string, unknown[]][], choMs = 1500) {
  const { goi } = useAuth();
  const taoKhoa = useKhoaBoNho();
  const dsJson = JSON.stringify(ds);
  useEffect(() => {
    let con = true;
    const t = setTimeout(async () => {
      for (const [fn, args] of JSON.parse(dsJson) as [string, unknown[]][]) {
        const k = taoKhoa(fn, ...args);
        if (!con || !k) return;
        const m = layNgay(k) ?? await layLuu(k);
        if (m && Date.now() - m.luc < 5 * 60e3) continue;
        try { luu(k, await goi(fn, ...args)); } catch { /* mất mạng: màn hình tự tải khi mở */ }
      }
    }, choMs);
    return () => { con = false; clearTimeout(t); };
  }, [dsJson, choMs, goi, taoKhoa]);
}

export function useDuLieu<T>(fn: string, args: unknown[], o: TuyChon = {}): DuLieu<T> {
  const { goi, goiMoi } = useAuth();
  const taoKhoa = useKhoaBoNho();
  const thamSo = JSON.stringify(args), luuMay = o.luuMay !== false, bat = o.bat !== false, giuCu = !!o.giuCu;
  const khoa = bat ? taoKhoa(fn, ...(JSON.parse(thamSo) as unknown[])) : '';
  const [muc, setMuc] = useState<Muc<T> | null>(() => (khoa ? layNgay<T>(khoa) : null));
  const [loi, setLoi] = useState(''), [dangTai, setDangTai] = useState(false);
  const lan = useRef(0);

  // Đổi khóa (đổi bộ lọc, đổi ngày…): hiện ngay số đã nhớ của khóa mới
  const [khoaDangXem, setKhoaDangXem] = useState(khoa);
  if (khoa !== khoaDangXem) {
    setKhoaDangXem(khoa);
    setMuc(c => (khoa ? layNgay<T>(khoa) : null) ?? (giuCu ? c : null));
    setLoi('');
  }
  // Số trong file (mở app lần sau) và các chỗ khác sửa số (vd. thu tiền xong)
  useEffect(() => {
    if (!khoa) return;
    let con = true;
    layLuu<T>(khoa).then(m => { if (con && m) setMuc(layNgay<T>(khoa) ?? m); }); // mở app lần sau: số trong file
    const bo = nghe(khoa, () => setMuc(layNgay<T>(khoa)));
    return () => { con = false; bo(); };
  }, [khoa]);

  const chay = useCallback(async (moi: boolean) => {
    if (!khoa) return;
    const so = ++lan.current;
    setDangTai(true);
    try {
      const du = await (moi ? goiMoi : goi)<T>(fn, ...(JSON.parse(thamSo) as unknown[]));
      luu(khoa, du, luuMay);
      if (so === lan.current) { setMuc(layNgay<T>(khoa)); setLoi(''); }
    } catch (e) {
      if (so === lan.current) setLoi((e as Error).message);
    } finally {
      if (so === lan.current) setDangTai(false);
    }
  }, [khoa, fn, thamSo, luuMay, goi, goiMoi]);

  const tai = useCallback(() => chay(false), [chay]);
  const lamMoi = useCallback(() => chay(true), [chay]);
  useFocusEffect(useCallback(() => { tai(); }, [tai])); // mở màn hình, quay lại, đổi tham số: hỏi số mới

  return { du: muc?.du ?? null, luc: muc?.luc ?? null, loi, dangTai, tai, lamMoi };
}
