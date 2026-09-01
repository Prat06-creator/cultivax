import React, { useMemo, useState } from "react";
import {useRouter} from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Svg, { Polyline, Path, Circle, Line } from "react-native-svg";
import {
  Leaf,
  TrendingUp,
  History,
  Gauge,
  FileText,
  Sprout,
  Bell,
  ChevronDown,
  CloudSun,
  Wifi,
  WifiOff,
  Settings,
  Home,
  Monitor,
  Bug,
  Droplet,
  Thermometer,
  CloudRain,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileType2,
  Sun,
  Check, MessageCircle,
  Camera
} from "lucide-react-native";

// ---------- Palette ----------
const C = {
  page: "#071813",
  sidebar: "#081b16",
  card: "#0e2620",
  cardAlt: "#0b1f1a",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(16,185,129,0.5)",
  hover: "rgba(255,255,255,0.06)",
  textPrimary: "#ffffff",
  textDim: "rgba(209,250,229,0.6)",
  textFaint: "rgba(209,250,229,0.4)",
  green: "#34d399",
  greenDeep: "#10b981",
  amber: "#fbbf24",
  red: "#f87171",
  blue: "#38bdf8",
  purple: "#a78bfa",
};

type RangeKey = "7D" | "30D" | "3M";
type Metric = "Crop Health" | "Soil Moisture" | "Temperature" | "Humidity";
type IconType = React.ComponentType<{ size?: number; color?: string }>;
type SidebarProps={
    activeNav: string;
  setActiveNav: (key: string) => void;
  isNarrow: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
}
interface Alert {
  id: number;
  icon: IconType;
  title: string;
  time: string;
  tone: "warn" | "danger";
}

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "image", label: "Image Diagnosis", icon: Camera },
  { key: "trends", label: "Trends", icon: TrendingUp },
  { key: "risk-history", label: "Risk History", icon: History },
  { key: "yield", label: "Yield Prediction", icon: Gauge },
  { key: "risk-forecast", label: "Risk Forecast", icon: Gauge },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "fields", label: "Fields", icon: Sprout },
 
] as const;
export default function Sidebar({
  activeNav,
  setActiveNav,
  isNarrow,
  sidebarOpen,
  setSidebarOpen,
  showToast,
}: SidebarProps) {
     const router = useRouter()
const insets = useSafeAreaInsets();
    //   const { width: screenWidth } = useWindowDimensions();
    //   const isNarrow = screenWidth < 900;
    // const [sidebarOpen, setSidebarOpen] = useState(!isNarrow);
    //   const [activeNav, setActiveNav] = useState<(typeof NAV_ITEMS)[number]["key"]>("overview");
    //   const [toast, setToast] = useState<string | null>(null);
//       function showToast(msg: string) {
//     setToast(msg);
//     setTimeout(() => setToast(null), 2200);

//   }
  return (
  <>
            {/* Sidebar */}
            {isNarrow && sidebarOpen && (
      <Pressable style={styles.backdrop} onPress={() => setSidebarOpen(false)} />
    )}
            {(!isNarrow || sidebarOpen) && (
              <View style={[styles.sidebar, isNarrow && styles.sidebarNarrow, { paddingTop: insets.top }]}>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.brandRow}>
                  <View style={styles.brandIcon}>
                    <Leaf size={18} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.brandTitle}>CultivaX</Text>
                    <Text style={styles.brandSub}>AI-Powered Smart Farming Assistant</Text>
                  </View>
                </View>
    
                <View style={styles.navList}>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => {
                           if (isNarrow) setSidebarOpen(false);
                            showToast(`Navigating to ${item.label}...`);
                          if (item.key === "trends") {
                            setTimeout(() => router.push("/trends"), 100);
                            return;
                          }
                           showToast(`Navigating to ${item.label}...`);
                          if (item.key === "image") {
                            setTimeout(() => router.push("/image"), 100);
                            return;
                          }
                          showToast(`Navigating to ${item.label}...`);
                          if (item.key === "overview") {
                            setTimeout(() => router.push("/"), 100);
                            return;
                          }
                          setActiveNav(item.key);
            
                        }}
                        style={({ pressed }) => [
                          styles.navBtn,
                          { backgroundColor: active ? C.green : pressed ? C.hover : "transparent" },
                        ]}
                      >
                         <View style={{ flexDirection: "row", alignItems: "center", gap: 12, width: "100%" }}>
                        <Icon size={17} color={active ? "#022c22" : "rgba(209,250,229,0.7)"} />
                        <Text style={[styles.navLabel, { color: active ? "#022c22" : "rgba(209,250,229,0.7)", fontWeight: active ? "600" : "400" }]}>
                          {item.label}
                        </Text>
                        {"badge" in item && item.badge ? (
                          <View style={styles.navBadge}>
                            <Text style={styles.navBadgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                        </View> 
                      </Pressable>
                    );
                  })}
                </View>
    
                {/* <View style={styles.edgeBox}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.dimText}>Edge Device</Text>
                    <Text style={[styles.dimText, { color: C.green, fontWeight: "600" }]}>Active</Text>
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 4 }]}>
                    <Text style={styles.dimText}>Last Sync</Text>
                    <Text style={[styles.dimText, { color: "rgba(209,250,229,0.8)" }]}>2 min ago</Text>
                  </View>
                </View> */}
              </ScrollView>
              </View>
            )}
            </>
  )
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: C.page },
  body: { flex: 1, minHeight: 0, flexDirection: "row", overflow: "hidden", position: "relative" },

  toast: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 50,
    borderRadius: 10,
    backgroundColor: C.green,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: { color: "#022c22", fontSize: 13, fontWeight: "600" },

  sidebar: {
    width: 220,          // <- set the width here, not on the ScrollView
    flexShrink: 0,       // <- prevents it from being squeezed or stretched
    minHeight: 0,
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: C.sidebar,
  },
  sidebarNarrow: {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: 260,
  zIndex: 40,
  borderBottomWidth: 0,
  maxHeight: undefined,
},

 backdrop: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  zIndex: 30,
},
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  brandIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center" },
  brandTitle: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  brandSub: { fontSize: 10, color: C.textFaint, marginTop: 2 },

  navList: { paddingHorizontal: 12, paddingVertical: 16, gap: 4 },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  navLabel: { flex: 1, fontSize: 14 },
  navBadge: { backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  navBadgeText: { color: "white", fontSize: 10 },

  edgeBox: { margin: 12, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  dimText: { fontSize: 12, color: C.textDim },

  main: { flex: 1, minHeight: 0 },
  mainContent: { padding: 20, gap: 20,paddingBottom: 40 },

  headerRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  h1: { fontSize: 22, fontWeight: "700", color: C.textPrimary },
  headerSub: { fontSize: 13, color: C.textDim, marginTop: 4 },

  pillCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  pillMain: { fontSize: 12, color: C.textPrimary, fontWeight: "600" },
  pillSub: { fontSize: 10, color: C.textFaint },

  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 999, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  notifDotText: { color: "white", fontSize: 9, fontWeight: "700" },

  notifPanel: { position: "absolute", right: 0, top: 46, width: 280, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 8, gap: 4 },
  notifItem: { flexDirection: "row", gap: 10, padding: 8 },
  notifTitle: { fontSize: 12, color: C.textPrimary, lineHeight: 17 },
  notifTime: { fontSize: 10, color: C.textFaint, marginTop: 2 },

  profileBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingLeft: 6, paddingRight: 12, paddingVertical: 6 },
  avatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: "rgba(16,185,129,0.2)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#6ee7b7", fontSize: 12, fontWeight: "700" },
  profileName: { fontSize: 12, fontWeight: "600", color: C.textPrimary },
  profileRole: { fontSize: 10, color: C.textFaint },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flexGrow: 1, flexBasis: 160, minWidth: 150, padding: 16 },
  statLabel: { fontSize: 12, color: C.textDim },
  statValue: { fontSize: 21, fontWeight: "700", color: C.textPrimary, marginTop: 8 },
  statSub: { fontSize: 11, marginTop: 2 },

  card: { borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 20 },
  flexCol: { flex: 1, minWidth: 300 },

  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sectionTitleText: { fontSize: 15, fontWeight: "600", color: C.textPrimary },
  cardHint: { fontSize: 12, color: C.textFaint, marginBottom: 16 },

  twoColRow: { flexDirection: "row", gap: 16 },
  trendRow: { flexDirection: "row", gap: 16 },

  segmentGroup: { flexDirection: "row", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  segmentText: { fontSize: 12 },

  selectBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  selectText: { color: "rgba(209,250,229,0.8)", fontSize: 12, flexShrink: 1 },
  dropdownList: { position: "absolute", top: 34, left: 0, right: 0, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 10, paddingVertical: 8 },
  dropdownItemText: { fontSize: 12, color: C.textDim },

  chartLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 4 },
  chartLabelText: { fontSize: 10, color: C.textFaint },

  progressTrack: { height: 6, width: "100%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },

  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)" },
  legendLabel: { fontSize: 12, color: C.textDim },
  legendValue: { fontSize: 12, color: C.textPrimary, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 999 },

  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 4 },
  linkText: { fontSize: 12, color: C.green, fontWeight: "500" },

  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "600" },

  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8 },
  tableHeaderCell: { fontSize: 12, color: C.textFaint },
  tableRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 10 },
  tableCell: { fontSize: 12, color: C.textDim },

  yieldValue: { fontSize: 28, fontWeight: "700", color: C.green, marginTop: 4 },
  yieldUnit: { fontSize: 13, color: C.textDim, fontWeight: "400" },
  footNote: { fontSize: 11, color: C.textFaint, marginTop: 8 },

  forecastRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  forecastLabel: { fontSize: 12, color: C.textDim, width: 100 },
  forecastPct: { fontSize: 12, color: C.textPrimary, width: 34, textAlign: "right" },

  recoBox: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)" },
  recoTitle: { fontSize: 12, fontWeight: "600", color: C.textPrimary, marginBottom: 8 },
  recoItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  recoText: { flex: 1, fontSize: 11, color: C.textDim },

  primaryBtn: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, backgroundColor: C.green, paddingVertical: 9 },
  primaryBtnFull: { marginTop: 16, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: C.green, paddingVertical: 11 },
  primaryBtnText: { color: "#022c22", fontSize: 12, fontWeight: "600" },

  smallLabel: { fontSize: 12, color: C.textDim, marginBottom: 8 },
  reportTypeBtn: { flexBasis: "22%", flexGrow: 1, minWidth: 90, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 12 },
  reportTypeText: { fontSize: 11, textAlign: "center" },

  previewBox: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  previewTitle: { fontSize: 14, fontWeight: "600", color: C.textPrimary },

  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },

  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, flexGrow: 1 },
  exportText: { fontSize: 11, fontWeight: "600" },

  alertRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  alertIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  alertTitle: { flex: 1, fontSize: 12, color: C.textDim, lineHeight: 17 },
  alertTime: { fontSize: 10, color: C.textFaint },

  placeholderNote: { textAlign: "center", fontSize: 12, color: C.textFaint, paddingVertical: 8 },
  footerText: { textAlign: "center", fontSize: 11, color: C.textFaint, paddingTop: 16, paddingBottom: 8 },
});