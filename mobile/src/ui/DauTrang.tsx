// Đầu trang của màn hình mở chồng lên (không phải tab): nút quay lại tròn kính mờ + tiêu đề lớn.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mau } from './theme';

type Props = { tieuDe: string; phu?: string; ben?: React.ReactNode };

export function DauTrang({ tieuDe, phu, ben }: Props) {
  const lui = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={s.boc}>
      <View style={s.hang}>
        <Pressable onPress={lui} style={s.nut} accessibilityRole="button" accessibilityLabel="Quay lại" testID="nut-lui" hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={mau.chu} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {ben}
      </View>
      <Text style={s.tieuDe} numberOfLines={2}>{tieuDe}</Text>
      {phu ? <Text style={s.phu}>{phu}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  boc: { marginBottom: 14 },
  hang: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  nut: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  tieuDe: { fontSize: 28, fontWeight: '800', color: mau.chu, letterSpacing: -0.5 },
  phu: { fontSize: 15, color: mau.chuPhu, marginTop: 4, lineHeight: 21 },
});
