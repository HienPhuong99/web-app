// Nút chính (chuyển sắc cam hồng) và nút phụ (viền), có trạng thái đang xử lý.
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { mau } from './theme';

type Props = {
  chu: string; onPress: () => void; dangChay?: boolean; tat?: boolean; phu?: boolean; nguyHiem?: boolean;
  bieuTuong?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle>; testID?: string;
};

export function Nut({ chu, onPress, dangChay, tat, phu, nguyHiem, bieuTuong, style, testID }: Props) {
  const khoa = tat || dangChay, mauChu = phu ? (nguyHiem ? mau.do : mau.chu) : '#fff';
  const noiDung = (
    <View style={s.trong}>
      {dangChay ? <ActivityIndicator color={mauChu} /> : bieuTuong ? <Ionicons name={bieuTuong} size={19} color={mauChu} /> : null}
      <Text style={[s.chu, { color: mauChu }]}>{chu}</Text>
    </View>
  );
  return (
    <Pressable onPress={onPress} disabled={khoa} accessibilityRole="button" accessibilityLabel={chu} testID={testID}
      style={({ pressed }) => [s.nut, phu && [s.phu, nguyHiem && { borderColor: 'rgba(217,45,32,0.35)' }], { opacity: khoa ? 0.6 : pressed ? 0.85 : 1 }, style]}>
      {phu ? noiDung : (
        <LinearGradient colors={['#FF9466', mau.cam, '#F0446B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.nen}>{noiDung}</LinearGradient>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  nut: { borderRadius: 18, overflow: 'hidden', minHeight: 54 },
  nen: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, minHeight: 54 },
  phu: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: mau.vach, justifyContent: 'center', paddingHorizontal: 18 },
  trong: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chu: { fontSize: 17, fontWeight: '700' },
});
