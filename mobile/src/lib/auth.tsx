// Trạng thái đăng nhập của app: mã máy (lưu an toàn trên máy), người dùng, địa chỉ máy chủ.
// goi() gọi API kèm mã máy; máy chủ báo hết phiên thì tự xóa mã máy để app quay về màn hình đăng nhập.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { goiApi, LoiPhien, type DangNhapKQ, type NguoiDung } from './api';
import { datNoiLuu, xoaHet } from './boNho';
import { doc, ghi } from './luuTru';
import { noiLuuMay } from './noiLuuMay';

datNoiLuu(noiLuuMay);

/** Máy chủ mặc định: EXPO_PUBLIC_API_URL (khi chạy thử với dev/chay-thu.js) hoặc link web app trong app.json */
export const MAY_CHU_MAC_DINH: string = process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string) || '';

type TrangThai = { dangTai: boolean; may: string | null; user: NguoiDung | null; tenCuaHang: string; mayChu: string };
type Auth = TrangThai & {
  dangNhap: (ten: string, matKhau: string) => Promise<void>;
  dangXuat: () => Promise<void>;
  doiMayChu: (url: string) => Promise<void>;
  goi: <T>(fn: string, ...args: unknown[]) => Promise<T>;
  /** Như goi nhưng máy chủ không dùng kết quả đã ghi nhớ (kéo xuống để làm mới) */
  goiMoi: <T>(fn: string, ...args: unknown[]) => Promise<T>;
  /** Lệnh ghi kèm mã lần gửi (taoMaGhi): giữ nguyên mã khi thử lại để không ghi trùng */
  goiGhi: <T>(maGhi: string, fn: string, ...args: unknown[]) => Promise<T>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tt, setTt] = useState<TrangThai>({ dangTai: true, may: null, user: null, tenCuaHang: 'phuonghihi', mayChu: MAY_CHU_MAC_DINH });

  useEffect(() => {
    (async () => {
      const [may, user, ten, mayChu] = await Promise.all([doc('may'), doc('user'), doc('tenCuaHang'), doc('mayChu')]);
      let u: NguoiDung | null = null;
      try { u = user ? JSON.parse(user) : null; } catch { /* hỏng thì đăng nhập lại */ }
      setTt({ dangTai: false, may: may && u ? may : null, user: may ? u : null, tenCuaHang: ten || 'phuonghihi', mayChu: mayChu || MAY_CHU_MAC_DINH });
    })();
  }, []);

  const xoaPhien = useCallback(async () => {
    await Promise.all([ghi('may', null), ghi('user', null), xoaHet()]); // dữ liệu đã nhớ của tài khoản cũng xóa
    setTt(t => ({ ...t, may: null, user: null }));
  }, []);

  const dangNhap = useCallback(async (ten: string, matKhau: string) => {
    if (!ten.trim() || !matKhau) throw new Error('Nhập tên đăng nhập và mật khẩu.');
    const tenMay = [Device.deviceName || Device.modelName, Platform.OS === 'web' ? 'trình duyệt' : ''].filter(Boolean).join(' · ') || 'Điện thoại';
    const kq = await goiApi<DangNhapKQ>(tt.mayChu, { fn: 'dangNhapMay', args: [ten.trim(), matKhau, tenMay] });
    const user: NguoiDung = { u: kq.user.u, ten: kq.user.ten, vaiTro: kq.user.vaiTro };
    await Promise.all([ghi('may', kq.may), ghi('user', JSON.stringify(user)), ghi('tenCuaHang', kq.cuaHang.ten)]);
    setTt(t => ({ ...t, may: kq.may, user, tenCuaHang: kq.cuaHang.ten }));
  }, [tt.mayChu]);

  const dangXuat = useCallback(async () => {
    const may = tt.may;
    await xoaPhien();
    if (may) goiApi(tt.mayChu, { fn: 'dangXuatMay', may }).catch(() => {}); // mất mạng thì máy chủ tự thu hồi khi đổi mật khẩu / khóa
  }, [tt.may, tt.mayChu, xoaPhien]);

  const doiMayChu = useCallback(async (url: string) => {
    const v = url.trim() || MAY_CHU_MAC_DINH;
    if (!/^https?:\/\/\S+$/.test(v)) throw new Error('Địa chỉ máy chủ phải bắt đầu bằng http:// hoặc https://');
    await ghi('mayChu', v === MAY_CHU_MAC_DINH ? null : v);
    setTt(t => ({ ...t, mayChu: v }));
  }, []);

  const goiVoi = useCallback(async <T,>(moi: boolean, fn: string, args: unknown[], maGhi?: string): Promise<T> => {
    try { return await goiApi<T>(tt.mayChu, { fn, args, may: tt.may, moi, maGhi }); }
    catch (e) { if (e instanceof LoiPhien) await xoaPhien(); throw e; }
  }, [tt.mayChu, tt.may, xoaPhien]);
  const goi = useCallback(<T,>(fn: string, ...args: unknown[]) => goiVoi<T>(false, fn, args), [goiVoi]);
  const goiMoi = useCallback(<T,>(fn: string, ...args: unknown[]) => goiVoi<T>(true, fn, args), [goiVoi]);
  const goiGhi = useCallback(<T,>(maGhi: string, fn: string, ...args: unknown[]) => goiVoi<T>(false, fn, args, maGhi), [goiVoi]);

  const gt = useMemo<Auth>(() => ({ ...tt, dangNhap, dangXuat, doiMayChu, goi, goiMoi, goiGhi }), [tt, dangNhap, dangXuat, doiMayChu, goi, goiMoi, goiGhi]);
  return <Ctx.Provider value={gt}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth phải nằm trong AuthProvider');
  return v;
}
