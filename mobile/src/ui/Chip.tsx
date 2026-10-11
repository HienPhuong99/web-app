// Nút chọn dạng viên thuốc nhỏ (hình thức thu tiền, VAT…); chon = đang được chọn; sau: biểu tượng sau chữ (vd. mũi tên chiều sắp xếp).
// Bấm là rung nhẹ và mờ đi ngay để biết đã nhận.
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { mau } from './theme';

type Props = { chu: string; chon: boolean; onPress: () => void; sau?: keyof typeof Ionicons.glyphMap; nhanDoc?: string; testID?: string };

export function Chip({ chu, chon, onPress, sau, nhanDoc, testID }: Props) {
  return (
    <Pressable onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={({ pressed }) => [s.chip, chon && s.chipChon, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ selected: chon }} accessibilityLabel={nhanDoc} testID={testID}>
      <Text style={[s.chipChu, chon && { color: '#fff' }]}>{chu}</Text>
      {sau ? <Ionicons name={sau} size={15} color={chon ? '#fff' : mau.chu} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: mau.vach },
  chipChon: { backgroundColor: mau.brand, borderColor: mau.brand },
  chipChu: { fontSize: 14, fontWeight: '700', color: mau.chu },
});
