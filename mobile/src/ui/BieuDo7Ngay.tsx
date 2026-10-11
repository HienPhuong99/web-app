// Cột doanh số 7 ngày gần nhất; cột hôm nay tô màu cam. onChon: bấm một cột để xem chi tiết ngày đó.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { thu, tienGon } from '../lib/dinhDang';
import { mau } from './theme';

export function BieuDo7Ngay({ ds, onChon }: { ds: { ngay: string; tien: number }[]; onChon?: (ngay: string) => void }) {
  const max = Math.max(1, ...ds.map(x => x.tien));
  return (
    <View style={s.hang}>
      {ds.map((x, i) => {
        const homNay = i === ds.length - 1;
        return (
          <Pressable key={x.ngay} style={({ pressed }) => [s.cot, pressed && { opacity: 0.6 }]} onPress={onChon ? () => onChon(x.ngay) : undefined} disabled={!onChon}
            accessibilityRole={onChon ? 'button' : undefined} accessibilityLabel={`${thu(x.ngay)}: ${tienGon(x.tien)}`} testID={'cot-' + x.ngay}>
            <Text style={[s.so, homNay && { color: mau.camDam }]} numberOfLines={1}>{x.tien ? tienGon(x.tien).replace(' ', '') : ''}</Text>
            <View style={s.ray}>
              <View style={[s.thanh, { height: `${Math.max(4, (x.tien / max) * 100)}%`, backgroundColor: homNay ? mau.cam : x.tien ? 'rgba(11,65,116,0.28)' : mau.xamNhat }]} />
            </View>
            <Text style={[s.thu, homNay && { color: mau.chu, fontWeight: '800' }]}>{homNay ? 'Nay' : thu(x.ngay)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  hang: { flexDirection: 'row', justifyContent: 'space-between', height: 130, marginTop: 4 },
  cot: { flex: 1, alignItems: 'center' },
  so: { fontSize: 10, color: mau.chuNhat, height: 14, fontWeight: '600' },
  ray: { flex: 1, width: 18, justifyContent: 'flex-end', marginVertical: 4 },
  thanh: { width: '100%', borderRadius: 9 },
  thu: { fontSize: 12, color: mau.chuNhat, fontWeight: '600' },
});
