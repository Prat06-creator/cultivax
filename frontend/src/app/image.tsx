import { View, Text } from 'react-native';
import ImageDiagnosis from '@/components/ImageDiagnosis';
export default function ImageScreen() {
  return (
    <View 
    style={{ flex: 1,  backgroundColor: '#071813' }}>
      {/* <Text style={{ color: '#fff', fontSize: 20 }}>Chat screen works! 🎉</Text> */}
      <ImageDiagnosis/>
    </View>
  );
}