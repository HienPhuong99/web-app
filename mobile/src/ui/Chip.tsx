// Nút chọn dạng viên thuốc nhỏ (hình thức thu tiền, VAT…); chon = đang được chọn.
import { Pressable, StyleSheet, Text } from 'react-native';
import { mau } from './theme';

export function Chip({ chu, chon, onPress, testID }: { chu: string; chon: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, chon && s.chipChon]} accessibilityRole="button" accessibilityState={{ selected: chon }} testID={testID}>
      <Text style={[s.chipChu, chon && { color: '#fff' }]}>{chu}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: mau.vach },
  chipChon: { backgroundColor: mau.brand, borderColor: mau.brand },
  chipChu: { fontSize: 14, fontWeight: '700', color: mau.chu },
});
