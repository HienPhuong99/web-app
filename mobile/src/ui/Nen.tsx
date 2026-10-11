// Nền màu đào chuyển sắc với hai quầng màu loang mềm phía sau, giống phong cách iOS 26.
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { mau } from './theme';

function Quang({ id, mauQuang, doDam, style }: { id: string; mauQuang: string; doDam: number; style: object }) {
  return (
    <Svg width={460} height={460} style={[{ position: 'absolute' }, style]} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={mauQuang} stopOpacity={doDam} />
          <Stop offset="1" stopColor={mauQuang} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={230} cy={230} r={230} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Nen({ children }: { children?: React.ReactNode }) {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="box-none">
      <LinearGradient colors={[mau.nen1, mau.nen2, mau.nen3]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Quang id="q1" mauQuang={mau.cam} doDam={0.32} style={{ top: -170, right: -170 }} />
      <Quang id="q2" mauQuang={mau.brand} doDam={0.12} style={{ bottom: 40, left: -200 }} />
      {children}
    </View>
  );
}
