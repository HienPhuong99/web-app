// Khóa app bằng Face ID / vân tay / mã máy: bật trong tab Thêm. Đã bật thì khóa khi mở app và khi quay lại app sau hơn 1 phút.
// Không thay cho đăng nhập: mã máy vẫn lưu trong Keychain/Keystore; đây là lớp chặn người cầm máy mở app khi máy đã mở khóa.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { doc, ghi } from './luuTru';

const KHOA_SAU_MS = 60 * 1000;

type Khoa = {
  coTheDung: boolean; tenCach: string; bat: boolean; dangKhoa: boolean;
  datBat: (v: boolean) => Promise<void>; moKhoa: () => Promise<boolean>;
};
const Ctx = createContext<Khoa | null>(null);

async function tenCachMoKhoa(): Promise<{ co: boolean; ten: string }> {
  if (Platform.OS === 'web') return { co: false, ten: '' };
  try {
    const [phanCung, daCai] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    const loai = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const T = LocalAuthentication.AuthenticationType;
    const ten = loai.includes(T.FACIAL_RECOGNITION) ? (Platform.OS === 'ios' ? 'Face ID' : 'khuôn mặt')
      : loai.includes(T.FINGERPRINT) ? (Platform.OS === 'ios' ? 'Touch ID' : 'vân tay') : 'mã khóa máy';
    // Chưa cài Face ID/vân tay vẫn dùng được mã khóa máy (nếu máy có đặt)
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return { co: (phanCung && daCai) || level !== LocalAuthentication.SecurityLevel.NONE, ten: phanCung && daCai ? ten : 'mã khóa máy' };
  } catch { return { co: false, ten: '' }; }
}

export function KhoaProvider({ children }: { children: React.ReactNode }) {
  const [cach, setCach] = useState({ co: false, ten: '' });
  const [bat, setBat] = useState(false), [dangKhoa, setDangKhoa] = useState(false);
  const roiLuc = useRef(0);

  useEffect(() => {
    (async () => {
      const [c, v] = await Promise.all([tenCachMoKhoa(), doc('khoaSinhTrac')]);
      setCach(c);
      if (v === '1' && c.co) { setBat(true); setDangKhoa(true); }
    })();
  }, []);

  useEffect(() => {
    if (!bat) return;
    const sub = AppState.addEventListener('change', tt => {
      if (tt === 'background') roiLuc.current = Date.now();
      else if (tt === 'active' && roiLuc.current && Date.now() - roiLuc.current > KHOA_SAU_MS) { roiLuc.current = 0; setDangKhoa(true); }
      else if (tt === 'active') roiLuc.current = 0;
    });
    return () => sub.remove();
  }, [bat]);

  const xacThuc = useCallback(async (loiNhac: string) => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: loiNhac, cancelLabel: 'Hủy', fallbackLabel: 'Dùng mật mã' });
    return r.success;
  }, []);

  const moKhoa = useCallback(async () => {
    const ok = await xacThuc('Mở khóa phuonghihi');
    if (ok) setDangKhoa(false);
    return ok;
  }, [xacThuc]);

  const datBat = useCallback(async (v: boolean) => {
    if (v) {
      if (!cach.co) throw new Error('Máy chưa cài Face ID / vân tay / mã khóa máy.');
      if (!(await xacThuc('Xác nhận để bật khóa app'))) throw new Error('Chưa xác nhận được, chưa bật khóa.');
    }
    await ghi('khoaSinhTrac', v ? '1' : null);
    setBat(v);
  }, [cach.co, xacThuc]);

  const gt = useMemo<Khoa>(() => ({ coTheDung: cach.co, tenCach: cach.ten, bat, dangKhoa: bat && dangKhoa, datBat, moKhoa }), [cach, bat, dangKhoa, datBat, moKhoa]);
  return <Ctx.Provider value={gt}>{children}</Ctx.Provider>;
}

export function useKhoa(): Khoa {
  const v = useContext(Ctx);
  if (!v) throw new Error('useKhoa phải nằm trong KhoaProvider');
  return v;
}
