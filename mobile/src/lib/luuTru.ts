// Lưu mã máy và cài đặt nhỏ: Keychain (iOS) / Keystore (Android) qua expo-secure-store; bản web (chỉ để thử) dùng localStorage.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const web = Platform.OS === 'web';

export async function doc(khoa: string): Promise<string | null> {
  try { return web ? globalThis.localStorage?.getItem(khoa) ?? null : await SecureStore.getItemAsync(khoa); }
  catch { return null; }
}

export async function ghi(khoa: string, giaTri: string | null): Promise<void> {
  try {
    if (web) { if (giaTri === null) globalThis.localStorage?.removeItem(khoa); else globalThis.localStorage?.setItem(khoa, giaTri); return; }
    if (giaTri === null) await SecureStore.deleteItemAsync(khoa);
    else await SecureStore.setItemAsync(khoa, giaTri, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  } catch { /* máy không cho lưu: lần sau phải đăng nhập lại, không làm hỏng thao tác đang làm */ }
}
