// Ô xác nhận đã kiểm iCloud (Tìm iPhone) khi thu máy cũ: chưa tích thì chưa thu được máy
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mau } from './theme';

export const LOI_ICLOUD = 'Kiểm tra máy đã thoát iCloud, tắt Tìm iPhone, không khóa mạng rồi tích ô xác nhận.';

export function OICloud({ chon, onDoi, testID }: { chon: boolean; onDoi: (v: boolean) => void; testID?: string }) {
  return (
    <Pressable onPress={() => onDoi(!chon)} style={s.o} role="checkbox" aria-checked={chon} testID={testID ?? 'o-icloud'}>
      <Ionicons name={chon ? 'checkbox' : 'square-outline'} size={24} color={chon ? mau.xanh : mau.chuNhat} />
      <Text style={s.chu}>Đã thoát iCloud / tắt Tìm iPhone, kiểm tra máy không khóa mạng</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  o: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, minHeight: 44 },
  chu: { flex: 1, fontSize: 15, fontWeight: '600', color: mau.chu },
});
