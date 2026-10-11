// Lấy IMEI/serial không qua camera: đọc mã trong ảnh có sẵn trên máy, hoặc dán chữ đã sao chép.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { scanFromURLAsync, type BarcodeType } from 'expo-camera';

// Mã vạch IMEI/serial trên hộp máy thường là Code 128; thêm vài loại phổ biến khác
export const LOAI_MA: BarcodeType[] = ['code128', 'code39', 'ean13', 'upc_a', 'qr', 'datamatrix'];

/** Chọn một ảnh trong máy và đọc mã trong đó. Trả null khi người dùng bỏ chọn ảnh. */
export async function maTuAnh(): Promise<string | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (r.canceled || !r.assets?.length) return null;
  let ds: { data: string }[] = [];
  try { ds = await scanFromURLAsync(r.assets[0].uri, LOAI_MA); } catch { /* ảnh không đọc được: báo như không có mã */ }
  const ma = ds.find(x => x.data)?.data;
  if (ma) return ma;
  // Thư viện quét ảnh của iOS chỉ nhận mã QR (giới hạn của expo-camera), Android và bản web đọc được cả mã vạch
  throw new Error(Platform.OS === 'ios'
    ? 'Không thấy mã QR trong ảnh. iPhone chỉ đọc được mã QR từ ảnh; với mã vạch IMEI: mở ảnh trong app Ảnh, giữ tay lên dãy số để Sao chép, rồi bấm Dán.'
    : 'Không đọc được mã trong ảnh. Chọn ảnh chụp gần, mã vạch rõ và chiếm phần lớn ảnh; hoặc gõ tay.');
}

/** Chữ đang có trong bộ nhớ tạm (đã Sao chép). */
export async function maTuBoNhoTam(): Promise<string> {
  let s = '';
  try { s = (await Clipboard.getStringAsync()).trim(); } catch { /* trình duyệt chặn đọc bộ nhớ tạm */ }
  if (!s) throw new Error('Chưa có gì để dán. Sao chép IMEI/serial trước: giữ tay lên dãy số trong ảnh, hoặc trong Cài đặt → Cài đặt chung → Giới thiệu.');
  return s.slice(0, 200);
}
