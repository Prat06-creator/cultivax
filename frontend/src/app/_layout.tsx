import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import { useColorScheme } from 'react-native';

// import { SidebarProvider } from '@/context/sidebar-context';
// import Sidebar from '@/components/sidebar';
import '../global.css';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider >
      {/* Slot renders whichever screen is currently active (e.g. index.tsx) */}
      <Slot />
      {/* <Sidebar /> was here too, but it's commented out above along with
          SidebarProvider — re-enable both together once that context exists,
          otherwise Sidebar will throw for missing context. */}
    </ThemeProvider>
  );
}