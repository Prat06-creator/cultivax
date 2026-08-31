import { View, Text } from 'react-native';
import TrendsScreen from '@/components/TrendsGraph';
export default function Trends() {
  return (
    <View 
    style={{ flex: 1,  backgroundColor: '#071813' }}>
      
      <TrendsScreen/>
    </View>
  );
}