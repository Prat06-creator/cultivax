import { View, Text } from 'react-native';
import ChatAssistantScreen from '@/components/ChatAssistantScreen';
export default function ChatScreen() {
  return (
    <View 
    style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#071813' }}>
      {/* <Text style={{ color: '#fff', fontSize: 20 }}>Chat screen works! 🎉</Text> */}
      <ChatAssistantScreen/>
    </View>
  );
}