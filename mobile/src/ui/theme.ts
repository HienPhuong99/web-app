// Màu và kích thước dùng chung. Nền màu đào ấm + thẻ kính mờ; chữ đậm màu để đọc rõ dưới đèn cửa hàng.
// Màu thương hiệu lấy từ SHOPS.phone.mau trong apps-script/Code.gs (xanh #0b4174, cam #ff6b4a).
import { Platform, type ViewStyle } from 'react-native';

export const mau = {
  nen1: '#FFF5EF', nen2: '#FFE5DA', nen3: '#F2F5FB',
  chu: '#101828', chuPhu: '#344054', chuNhat: '#5D6B82',
  brand: '#0B4174', brandNhat: '#E3ECF7', cam: '#FF6B4A', camDam: '#E5502F', camNhat: '#FFE4DA',
  xanh: '#079455', xanhNhat: '#D3F8DF', do: '#D92D20', doNhat: '#FEE4E2', vang: '#B54708', vangNhat: '#FEF0C7',
  xam: '#667085', xamNhat: '#EEF1F6',
  kinh: 'rgba(255,255,255,0.74)', vienKinh: 'rgba(255,255,255,0.95)', vach: 'rgba(16,24,40,0.08)',
};

export const bo = { lon: 28, vua: 20, nho: 14, tron: 999 };

export const bong: ViewStyle = Platform.select<ViewStyle>({
  ios: { shadowColor: '#7A2E12', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 3 },
  default: { boxShadow: '0 10px 30px rgba(122,46,18,0.10)' } as ViewStyle,
})!;

/** Khoảng trống dưới cùng để nội dung không bị thanh tab nổi che */
export const DEM_DUOI = 120;
