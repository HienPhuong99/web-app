// Ảnh máy của phiếu sửa chữa (lưu trên Google Drive): tải từng ảnh từ máy chủ (anhSuaChua), hiện ô nhỏ; bấm để xem to, bấm lần nữa để đóng.
// Ảnh đã tải nhớ trong lần chạy app này (không ghi ra máy, ảnh nặng).
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../lib/auth';
import { mau } from './theme';

const daTai = new Map<string, string>(); // 'SoPN|i|id' → data URI

function OAnh({ so, i, id, onXem }: { so: string; i: number; id: string; onXem: (uri: string) => void }) {
  const { goi } = useAuth();
  const khoa = so + '|' + i + '|' + id;
  const [uri, setUri] = useState(() => daTai.get(khoa) ?? ''), [loi, setLoi] = useState(false);
  useEffect(() => {
    if (daTai.has(khoa)) return;
    let con = true;
    goi<{ base64: string; mime: string }>('anhSuaChua', so, i)
      .then(a => { const u = `data:${a.mime || 'image/jpeg'};base64,${a.base64}`; daTai.set(khoa, u); if (con) setUri(u); })
      .catch(() => { if (con) setLoi(true); });
    return () => { con = false; };
  }, [goi, khoa, so, i]);
  return (
    <Pressable onPress={() => uri && onXem(uri)} style={s.o} accessibilityLabel={`Xem ảnh ${i + 1}`} testID={'anh-sua-' + i}>
      {uri ? <Image source={{ uri }} style={s.anh} /> : loi ? <Text style={s.loi}>Lỗi tải</Text> : <ActivityIndicator color={mau.brand} />}
    </Pressable>
  );
}

export function AnhSua({ so, anh }: { so: string; anh: string[] }) {
  const [xem, setXem] = useState('');
  if (!anh.length) return null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} testID="ds-anh-sua">
        {anh.map((id, i) => <OAnh key={id} so={so} i={i} id={id} onXem={setXem} />)}
      </ScrollView>
      <Modal visible={!!xem} transparent animationType="fade" onRequestClose={() => setXem('')}>
        <Pressable style={s.nen} onPress={() => setXem('')} accessibilityLabel="Đóng ảnh" testID="dong-anh-sua">
          {xem ? <Image source={{ uri: xem }} style={s.to} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  o: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  anh: { width: 84, height: 84 },
  loi: { fontSize: 12, color: mau.xam },
  nen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  to: { width: '100%', height: '85%' },
});
