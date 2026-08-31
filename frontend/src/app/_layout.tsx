import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { useColorScheme } from 'react-native';
import {Stack} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// import { SidebarProvider } from '@/context/sidebar-context';
// import Sidebar from '@/components/sidebar';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="trends" />
        </Stack></SafeAreaProvider>
      </ThemeProvider>
    
  );
}