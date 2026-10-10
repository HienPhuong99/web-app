// Thẻ kính mờ bo góc lớn. nhan = dòng chữ nhỏ viết hoa có màu ở đầu thẻ (như "TRẢ GÓP", "HỢP ĐỒNG").
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { bo, bong, mau } from './theme';

type Props = { nhan?: string; mauNhan?: string; tieuDe?: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode; testID?: string };

export function The({ nhan, mauNhan, tieuDe, style, children, testID }: Props) {
  return (
    <View style={[s.the, bong, style]} testID={testID}>
      {nhan ? <Text style={[s.nhan, { color: mauNhan ?? mau.cam }]}>{nhan.toUpperCase()}</Text> : null}
      {tieuDe ? <Text style={s.tieuDe}>{tieuDe}</Text> : null}
      {children}
    </View>
  );
}

export const s = StyleSheet.create({
  the: { backgroundColor: mau.kinh, borderColor: mau.vienKinh, borderWidth: 1, borderRadius: bo.lon, padding: 18 },
  nhan: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  tieuDe: { fontSize: 18, fontWeight: '700', color: mau.chu, marginBottom: 8 },
});
