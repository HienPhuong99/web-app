// Vòng số lớn có quầng sáng: tiLe 0..1 là phần vòng được tô.
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { mau } from './theme';

type Props = { tiLe: number; giua: string; duoi: string; coKinh?: number };

export function VongSo({ tiLe, giua, duoi, coKinh = 200 }: Props) {
  const net = 16, r = (coKinh - net) / 2, chuVi = 2 * Math.PI * r, t = Math.max(0, Math.min(1, tiLe || 0));
  return (
    <View style={{ width: coKinh + 40, height: coKinh + 40, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[s.quang, { width: coKinh + 40, height: coKinh + 40, borderRadius: (coKinh + 40) / 2 }]} />
      <Svg width={coKinh} height={coKinh}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FF9A6B" />
            <Stop offset="1" stopColor={mau.cam} />
          </LinearGradient>
        </Defs>
        <Circle cx={coKinh / 2} cy={coKinh / 2} r={r} stroke="rgba(255,107,74,0.14)" strokeWidth={net} fill="rgba(255,255,255,0.55)" />
        <Circle cx={coKinh / 2} cy={coKinh / 2} r={r} stroke="url(#g)" strokeWidth={net} fill="none" strokeLinecap="round"
          strokeDasharray={`${chuVi} ${chuVi}`} strokeDashoffset={chuVi * (1 - t)} transform={`rotate(-90 ${coKinh / 2} ${coKinh / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Text style={s.giua} adjustsFontSizeToFit numberOfLines={1} testID="vong-giua">{giua}</Text>
        <Text style={s.duoi}>{duoi}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  quang: { position: 'absolute', backgroundColor: 'rgba(255,107,74,0.10)' },
  giua: { fontSize: 40, fontWeight: '800', color: mau.chu, maxWidth: 160, letterSpacing: -1 },
  duoi: { fontSize: 14, color: mau.chuPhu, marginTop: 2, fontWeight: '600' },
});
