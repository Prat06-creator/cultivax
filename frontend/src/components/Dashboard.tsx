import React, { useMemo, useState, useRef } from "react";
import {useRouter} from 'expo-router'
import Sidebar from "@/components/sidebar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet, Modal,
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
  Check, MessageCircle
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

interface Alert {
  id: number;
  icon: IconType;
  title: string;
  time: string;
  tone: "warn" | "danger";
}

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "chats", label: "Chats", icon: MessageCircle },
  { key: "trends", label: "Trends", icon: TrendingUp },
  { key: "risk-history", label: "Risk History", icon: History },
  { key: "yield", label: "Yield Prediction", icon: Gauge },
  { key: "risk-forecast", label: "Risk Forecast", icon: Gauge },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "fields", label: "Fields", icon: Sprout },
 
] as const;

const CHART_DATA: Record<
  RangeKey,
  { label: string; "Crop Health": number; "Soil Moisture": number; Temperature: number; Humidity: number }[]
> = {
  "7D": [
    { label: "19 May", "Crop Health": 46, "Soil Moisture": 60, Temperature: 26, Humidity: 55 },
    { label: "20 May", "Crop Health": 63, "Soil Moisture": 58, Temperature: 27, Humidity: 57 },
    { label: "21 May", "Crop Health": 58, "Soil Moisture": 63, Temperature: 27, Humidity: 58 },
    { label: "22 May", "Crop Health": 70, "Soil Moisture": 65, Temperature: 28, Humidity: 56 },
    { label: "23 May", "Crop Health": 68, "Soil Moisture": 64, Temperature: 28, Humidity: 59 },
    { label: "24 May", "Crop Health": 78, "Soil Moisture": 66, Temperature: 28, Humidity: 60 },
    { label: "25 May", "Crop Health": 84, "Soil Moisture": 68, Temperature: 28.4, Humidity: 60 },
  ],
  "30D": Array.from({ length: 10 }, (_, i) => ({
    label: `Day ${i * 3 + 1}`,
    "Crop Health": Math.round(40 + Math.sin(i / 2) * 10 + i * 4.2),
    "Soil Moisture": Math.round(50 + Math.cos(i / 3) * 8 + i * 1.6),
    Temperature: Math.round((24 + Math.sin(i / 2) * 3) * 10) / 10,
    Humidity: Math.round(50 + Math.cos(i / 2) * 6),
  })),
  "3M": Array.from({ length: 12 }, (_, i) => ({
    label: `Wk ${i + 1}`,
    "Crop Health": Math.round(45 + Math.sin(i / 3) * 14 + i * 2.6),
    "Soil Moisture": Math.round(52 + Math.cos(i / 4) * 10 + i * 1.1),
    Temperature: Math.round((23 + Math.sin(i / 4) * 4) * 10) / 10,
    Humidity: Math.round(48 + Math.sin(i / 3) * 8),
  })),
};

const RISK_HISTORY = [
  { date: "25 May 2025", type: "Leaf Disease", icon: Leaf, severity: "High", field: "Field A", action: "Fungicide advised" },
  { date: "24 May 2025", type: "Low Soil Moisture", icon: Droplet, severity: "Medium", field: "Field B", action: "Irrigation advised" },
  { date: "21 May 2025", type: "Pest Detected", icon: Bug, severity: "High", field: "Field A", action: "Pesticide advised" },
  { date: "18 May 2025", type: "Heat Stress", icon: Sun, severity: "Medium", field: "Field A", action: "Increase irrigation" },
  { date: "15 May 2025", type: "Nutrient Deficiency", icon: Leaf, severity: "Low", field: "Field C", action: "Fertilizer advised" },
];

const RISK_FORECAST = [
  { name: "Heat Stress", icon: Sun, prob: 78, level: "High" },
  { name: "Water Stress", icon: Droplet, prob: 62, level: "Medium" },
  { name: "Pest Outbreak", icon: Bug, prob: 41, level: "Low-Medium" },
  { name: "Excess Rainfall", icon: CloudRain, prob: 20, level: "Low" },
];

const RECOMMENDATIONS = [
  "High heat risk expected in 2-3 days",
  "Increase irrigation monitoring",
  "Check soil moisture twice daily",
  "Avoid unnecessary fertilizer application",
];

const REPORT_TYPES = [
  { key: "farm", label: "Farm Health Report", icon: FileText },
  { key: "risk", label: "Risk Analysis Report", icon: Gauge },
  { key: "yield", label: "Yield Prediction Report", icon: TrendingUp },
  { key: "weather", label: "Weather Impact Report", icon: CloudRain },
] as const;

const REPORT_SECTIONS: Record<string, string[]> = {
  farm: ["Crop & Field Summary", "Environmental Conditions", "Risk Summary", "Yield Prediction", "Recommendations"],
  risk: ["Risk Summary", "Risk History", "Risk Forecast", "Recommendations"],
  yield: ["Yield Prediction", "Factors Affecting Yield", "Crop & Field Summary"],
  weather: ["Environmental Conditions", "Upcoming Rainfall", "Temperature Trends"],
};

const ALERTS: Alert[] = [
  { id: 1, icon: Sun, title: "High heat stress predicted in Field A", time: "2 hours ago", tone: "warn" },
  { id: 2, icon: Droplet, title: "Low soil moisture detected in Field B", time: "5 hours ago", tone: "danger" },
  { id: 3, icon: Bug, title: "Pest detected in Field C", time: "1 day ago", tone: "warn" },
];

function severityColor(sev: string) {
  if (sev === "High") return C.red;
  if (sev === "Medium") return C.amber;
  return C.green;
}

// ---------- small building blocks ----------

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "26" }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 100,
    h = 28;
  const min = Math.min(...points) * 0.9;
  const max = Math.max(...points) * 1.1;
  const norm = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width="100%" height={28} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 6 }}>
      <Polyline points={norm} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LineChart({
  data,
  dataKey,
  color,
  height = 200,
}: {
  data: { label: string; [k: string]: number | string }[];
  dataKey: string;
  color: string;
  height?: number;
}) {
  const w = 700;
  const values = data.map((d) => Number(d[dataKey]));
  const min = Math.min(...values) * 0.85;
  const max = Math.max(...values) * 1.1;
  const stepX = w / (data.length - 1 || 1);
  const points = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / (max - min || 1)) * height,
  }));
  const path = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},${height} L0,${height} Z`;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <Line key={g} x1={0} x2={w} y1={height * g} y2={height * g} stroke="#1f3b34" strokeWidth={1} strokeDasharray="4,4" />
        ))}
        <Path d={areaPath} fill={color} opacity={0.08} />
        <Path d={path} fill="none" stroke={color} strokeWidth={2.5} />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={C.page} stroke={color} strokeWidth={2} />
        ))}
      </Svg>
      <View style={styles.chartLabelsRow}>
        {data.map((d) => (
          <Text key={d.label} style={styles.chartLabelText}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  ); 
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ n, title, action }: { n?: string; title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleText}>{n ? `${n}. ${title}` : title}</Text>
      {action}
    </View>
  );
}

// simple tap-to-open dropdown, replaces <select>
// function Dropdown({
//   value,
//   options,
//   onChange,
//   width,
// }: {
//   value: string;
//   options: string[];
//   onChange: (v: string) => void;
//   width?: number;
// }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <View style={{  width }}>
//       <Pressable style={styles.selectBox} onPress={() => setOpen((true) )}>
//         <Text style={styles.selectText} numberOfLines={1}>
//           {value}
//         </Text>
//         <ChevronDown size={13} color={C.textFaint} />
//       </Pressable>
//        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
//         <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
//           <View style={styles.modalDropdown}>
//       {/* {open && (
//         <View style={styles.dropdownList}> */}
//           {options.map((opt) => (
//             <Pressable
//               key={opt}
//               style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: C.hover }]}
//               onPress={() => {
//                 onChange(opt);
//                 setOpen(false);
//               }}
//             >
//               <Text style={[styles.dropdownItemText, opt === value && { color: C.green }]}>{opt}</Text>
//             </Pressable>
//           ))}
//         </View>
//         </Pressable>
//         </Modal>
//          </View>
//       // )
//       // }
    
//   );
// }
function Dropdown({
  value,
  options,
  onChange,
  width,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const triggerRef = useRef<View>(null);

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, width: w, height: h });
      setOpen(true);
    });
  };

  return (
    <View style={{ width }}>
      <Pressable ref={triggerRef} style={styles.selectBox} onPress={openDropdown}>
        <Text style={styles.selectText} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={13} color={C.textFaint} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdropTop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.modalDropdown,
              {
                position: "absolute",
                top: anchor.y + anchor.height + 6,
                left: anchor.x,
                width: Math.max(anchor.width, width ?? 0) || undefined,
              },
            ]}
          >
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={({ pressed }) => [styles.dropdownItem, pressed && { backgroundColor: C.hover }]}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, opt === value && { color: C.green }]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------- Main component ----------
export default function Dashboard() {
  const router = useRouter()
    const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 900;

  const [activeNav, setActiveNav] = useState<(typeof NAV_ITEMS)[number]["key"]>("overview");
  const [range, setRange] = useState<RangeKey>("7D");
  const [metric, setMetric] = useState<Metric>("Crop Health");
  const [crop, setCrop] = useState("Rice (Paddy)");
  const [reportType, setReportType] = useState<string>("farm");
  const [checkedSections, setCheckedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(REPORT_SECTIONS.farm.map((s) => [s, true]))
  );
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [offline, setOffline] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(!isNarrow);

  const data = CHART_DATA[range];
  const metricColor: Record<Metric, string> = {
    "Crop Health": C.green,
    "Soil Moisture": C.blue,
    Temperature: C.red,
    Humidity: C.purple,
  };

  const latest = data[data.length - 1];

  const stats = useMemo(
    () => [
      { icon: Leaf, label: "Crop Health Score", value: `${latest["Crop Health"]}%`, sub: "↑ 8% vs last 7 days", color: C.green, spark: data.map((d) => Number(d["Crop Health"])) },
      { icon: Gauge, label: "Overall Risk Score", value: "32/100", sub: "Medium Risk", color: C.amber, spark: [20, 25, 22, 30, 28, 34, 32] },
      { icon: Droplet, label: "Soil Moisture", value: `${latest["Soil Moisture"]}%`, sub: "Optimal", color: C.blue, spark: data.map((d) => Number(d["Soil Moisture"])) },
      { icon: Thermometer, label: "Temperature", value: `${latest["Temperature"]}°C`, sub: "↑ 1.2°C vs yesterday", color: C.red, spark: data.map((d) => Number(d["Temperature"])) },
      { icon: CloudRain, label: "Upcoming Rainfall", value: "12 mm", sub: "In next 3 days", color: C.purple, spark: [4, 8, 6, 10, 12, 9, 12] },
      { icon: Sprout, label: "Field Status", value: "3/4", sub: "Fields Healthy", color: C.green, spark: [2, 2, 3, 3, 2, 3, 3] },
    ],
    [data, latest]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }
  function closeNotif() {
  setNotifOpen(false);
}
  function toggleReportType(key: string) {
    setReportType(key);
    setCheckedSections(Object.fromEntries((REPORT_SECTIONS[key] || []).map((s) => [s, true])));
  }

  function toggleSection(s: string) {
    setCheckedSections((prev) => ({ ...prev, [s]: !prev[s] }));
  }

  return (
    <View style={styles.root}>
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={[styles.body,  ]}>
        <Sidebar
        activeNav={activeNav}
  setActiveNav={setActiveNav}
  isNarrow={isNarrow}
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  showToast={showToast}/>
        {/* Sidebar */}
        {/* {isNarrow && sidebarOpen && (
  <Pressable style={styles.backdrop} onPress={() => setSidebarOpen(false)} />
)} */}
        {/* {(!isNarrow || sidebarOpen) && (
          <View style={[styles.sidebar, isNarrow && styles.sidebarNarrow]}>
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
                      if (item.key === "chats") {
                        setTimeout(() => router.push("/chat"), 100);
                        return;
                      }
                      setActiveNav(item.key);
        
                    }}
                    style={({ pressed }) => [
                      styles.navBtn,
                      { backgroundColor: active ? C.green : pressed ? C.hover : "transparent" },
                    ]}
                  >
                    <Icon size={17} color={active ? "#022c22" : "rgba(209,250,229,0.7)"} />
                    <Text style={[styles.navLabel, { color: active ? "#022c22" : "rgba(209,250,229,0.7)", fontWeight: active ? "600" : "400" }]}>
                      {item.label}
                    </Text>
                    {"badge" in item && item.badge ? (
                      <View style={styles.navBadge}>
                        <Text style={styles.navBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.edgeBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.dimText}>Edge Device</Text>
                <Text style={[styles.dimText, { color: C.green, fontWeight: "600" }]}>Active</Text>
              </View>
              <View style={[styles.rowBetween, { marginTop: 4 }]}>
                <Text style={styles.dimText}>Last Sync</Text>
                <Text style={[styles.dimText, { color: "rgba(209,250,229,0.8)" }]}>2 min ago</Text>
              </View>
            </View>
          </ScrollView>
          </View>
        )} */}

        {/* Main */}
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}
        onScrollBeginDrag={closeNotif}
  onScroll={closeNotif}
  scrollEventThrottle={16}>
          {/* Header */}
          {/* <View style={[styles.headerRow, isNarrow && { flexDirection: "column", alignItems: "flex-start" }, { paddingTop: insets.top + 8 }]}>
            <View style={{ flexShrink: 1 }}>
              <View style={styles.rowCenter}>
                {isNarrow && (
                  <Pressable onPress={() => setSidebarOpen((o) => !o)} style={{ marginRight: 10 }}>
                    <Monitor size={20} color={C.textDim} />
                  </Pressable>
                )}
                <Text style={styles.h1}>Dashboard &amp; Insights</Text>
              </View>
              <Text style={styles.headerSub}>Real-time monitoring, insights and actionable recommendations for your farm.</Text>
            </View>

            <View style={[styles.rowWrap, { gap: 8 }]}>
              <View style={styles.pillCard}>
                <CloudSun size={16} color={C.amber} />
                <View>
                  <Text style={styles.pillMain}>28°C</Text>
                  <Text style={styles.pillSub}>Partly Cloudy</Text>
                </View>
              </View>

              <Pressable style={styles.pillCard} onPress={() => setOffline((o) => !o)}>
                {offline ? <WifiOff size={16} color={C.green} /> : <Wifi size={16} color={C.green} />}
                <View>
                  <Text style={styles.pillMain}>{offline ? "Offline Mode" : "Online"}</Text>
                  <Text style={styles.pillSub}>{offline ? "Data will sync when online" : "Synced just now"}</Text>
                </View>
              </Pressable>

              <View style={{ position: "relative" }}>
                <Pressable style={styles.iconBtn} onPress={() => setNotifOpen((o) => !o)}>
                  <Bell size={17} color={C.textPrimary} />
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>3</Text>
                  </View>
                </Pressable>
                
              </View>

              <Pressable style={styles.profileBtn} onPress={() => showToast("Profile menu coming soon")}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>RK</Text>
                </View>
                <View>
                  <Text style={styles.profileName}>UserName</Text>
                  <Text style={styles.profileRole}>Farmer</Text>
                </View>
                <ChevronDown size={14} color={C.textFaint} />
              </Pressable>
            </View>
          </View> */}
          <View style={[styles.headerRow, isNarrow && { flexDirection: "column", alignItems: "stretch" }, { paddingTop: insets.top  }]}>
  {isNarrow ? (
    <>
      <View style={styles.topBarRow}>
  <View style={[styles.rowCenter, { flex: 1, minWidth: 0 }]}>
    <Pressable onPress={() => setSidebarOpen((o) => !o)} style={{ marginRight: 10 }}>
      <Monitor size={20} color={C.textDim} />
    </Pressable>
    <Text style={[styles.h1, { flexShrink: 1 }]} numberOfLines={2}>Dashboard &amp; Insights</Text>
  </View>

  <Pressable onPress={() => showToast("Profile menu coming soon")} style={{ flexShrink: 0, marginLeft: 10 }}>
    {/* Mobile Branch */}
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>U</Text>
    </View>
  </Pressable>
</View>
<Text style={[styles.headerSub, { flexShrink: 1, minWidth: 0, width: "100%" }]}>Real-time monitoring, insights and actionable recommendations for your farm.</Text>
      <View style={[styles.rowWrap, { gap: 8, marginTop: 12 }]}>
        <View style={styles.pillCard}>
          <CloudSun size={16} color={C.amber} />
          <View>
            <Text style={styles.pillMain}>28°C</Text>
            <Text style={styles.pillSub}>Partly Cloudy</Text>
          </View>
        </View>

        {/* <Pressable style={styles.pillCard} onPress={() => setOffline((o) => !o)}>
          {offline ? <WifiOff size={16} color={C.green} /> : <Wifi size={16} color={C.green} />}
          <View>
            <Text style={styles.pillMain}>{offline ? "Offline Mode" : "Online"}</Text>
            <Text style={styles.pillSub}>{offline ? "Data will sync when online" : "Synced just now"}</Text>
          </View>
        </Pressable>  */}

        <View style={{ position: "relative" }}>
          <Pressable style={styles.iconBtn} onPress={() => setNotifOpen((o) => !o)}>
            <Bell size={17} color={C.textPrimary} />
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>3</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </>
  ) : (
    <>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.h1}>Dashboard &amp; Insights</Text>
        <Text style={styles.headerSub}>Real-time monitoring, insights and actionable recommendations for your farm.</Text>
      </View>

      <View style={[styles.rowWrap, { gap: 8 }]}>
        <View style={styles.pillCard}>
          <CloudSun size={16} color={C.amber} />
          <View>
            <Text style={styles.pillMain}>28°C</Text>
            <Text style={styles.pillSub}>Partly Cloudy</Text>
          </View>
        </View>

        {/* <Pressable style={styles.pillCard} onPress={() => setOffline((o) => !o)}>
          {offline ? <WifiOff size={16} color={C.green} /> : <Wifi size={16} color={C.green} />}
          <View>
            <Text style={styles.pillMain}>{offline ? "Offline Mode" : "Online"}</Text>
            <Text style={styles.pillSub}>{offline ? "Data will sync when online" : "Synced just now"}</Text>
          </View>
        </Pressable> */}

        <View style={{ position: "relative" }}>
          <Pressable style={styles.iconBtn} onPress={() => setNotifOpen((o) => !o)}>
            <Bell size={17} color={C.textPrimary} />
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>3</Text>
            </View>
          </Pressable>
        </View>

        <Pressable style={styles.profileBtn} onPress={() => showToast("Profile menu coming soon")}>
          {/* Desktop Branch */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U</Text>
          </View>
          <View>
            <Text style={styles.profileName}>UserName</Text>
            <Text style={styles.profileRole}>Farmer</Text>
          </View>
          <ChevronDown size={14} color={C.textFaint} />
        </Pressable>
      </View>
    </>
  )}
</View>
          {/* Stat cards */}
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <Card key={s.label} style={styles.statCard}>
                <View style={styles.rowCenter}>
                  <s.icon size={14} color={s.color} />
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>
                <Sparkline points={s.spark} color={s.color} />
              </Card>
            ))}
          </View>

          {/* Trends + Risk history */}
          <View style={[styles.twoColRow, isNarrow && { flexDirection: "column" }]}>
            <Card style={styles.flexCol}>
              {/* <SectionTitle
                n="1"
                title="Trends"
                action={
  <View style={[styles.rowWrap, { gap: 8 }, isNarrow && { width: "100%", marginTop: 8 }]}>
    <Dropdown value={metric} options={Object.keys(metricColor)} onChange={(v) => setMetric(v as Metric)} width={130} />
    <View style={[styles.segmentGroup, isNarrow && { flex: 1 }]}>
      {(["7D", "30D", "3M"] as RangeKey[]).map((r) => (
        <Pressable key={r} onPress={() => setRange(r)} style={[styles.segmentBtn, isNarrow && { flex: 1, alignItems: "center" }, { backgroundColor: range === r ? C.green : "transparent" }]}>
          <Text style={[styles.segmentText, { color: range === r ? "#022c22" : C.textDim, fontWeight: range === r ? "600" : "400" }]}>
            {r === "7D" ? "7 Days" : r === "30D" ? "30Days" : "3Months"}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
}
              /> */}
              {/* <Text style={styles.cardHint}>Track key patterns over time</Text> */}
            <SectionTitle n="1" title="Trends" />

<Text style={styles.cardHint}>Track key patterns over time</Text>

<View style={[styles.rowWrap, { gap: 8 }, isNarrow && { width: "100%" }]}>
  <Dropdown value={metric} options={Object.keys(metricColor)} onChange={(v) => setMetric(v as Metric)} width={130} />
  <View style={[styles.segmentGroup, isNarrow && { flex: 1 }]}>
    {(["7D", "30D", "3M"] as RangeKey[]).map((r) => (
      <Pressable key={r} onPress={() => setRange(r)} style={[styles.segmentBtn, isNarrow && { flex: 1, alignItems: "center" }, { backgroundColor: range === r ? C.green : "transparent" }]}>
        <Text style={[styles.segmentText, { color: range === r ? "#022c22" : C.textDim, fontWeight: range === r ? "600" : "400" }]}>
          {r === "7D" ? "7 Days" : r === "30D" ? "30 Days" : "3 Months"}
        </Text>
      </Pressable>
    ))}
  </View>
</View>
              <View style={[styles.trendRow, isNarrow && { flexDirection: "column" }]}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <LineChart data={data} dataKey={metric} color={metricColor[metric]} height={200} />
                </View>
                <View style={{ flex: 1, minWidth: 180, gap: 8, marginTop: isNarrow ? 0 : 12 }}>
                  {(Object.keys(metricColor) as Metric[]).map((m) => (
                    <View key={m} style={styles.legendRow}>
                      <View style={styles.rowCenter}>
                        <View style={[styles.dot, { backgroundColor: metricColor[m] }]} />
                        <Text style={styles.legendLabel}>{m}</Text>
                      </View>
                      <Text style={styles.legendValue}>
                        {(latest as any)[m]}
                        {m === "Temperature" ? "°C" : "%"}
                      </Text>
                    </View>
                  ))}
                  <Pressable onPress={() => setActiveNav("trends")} style={styles.linkBtn}>
                    <Text style={styles.linkText}>View All Trends</Text>
                    <ArrowRight size={12} color={C.green} />
                  </Pressable>
                </View>
              </View>
            </Card>

            <Card style={styles.flexCol}>
              <SectionTitle
                n="2"
                title="Risk History"
                action={
                  <Pressable onPress={() => setActiveNav("risk-history")}>
                    <Text style={styles.linkText}>View All</Text>
                  </Pressable>
                }
              />
              <Text style={styles.cardHint}>View past risks and events</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { width: 90 }]}>Date</Text>
                    <Text style={[styles.tableHeaderCell, { width: 140 }]}>Risk Type</Text>
                    <Text style={[styles.tableHeaderCell, { width: 80 }]}>Severity</Text>
                    <Text style={[styles.tableHeaderCell, { width: 70 }]}>Field</Text>
                    <Text style={[styles.tableHeaderCell, { width: 140 }]}>Action Taken</Text>
                  </View>
                  {/* {RISK_HISTORY.map((r) => (
                    <View key={r.date + r.type} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 90 }]}>{r.date}</Text>
                      <View style={[styles.rowCenter, { width: 140 }]}>
                        <r.icon size={13} color={C.green} />
                        <Text style={styles.tableCell}> {r.type}</Text>
                      </View>
                      <View style={{ width: 80 }}>
                        <Badge label={r.severity} color={severityColor(r.severity)} />
                      </View>
                      <Text style={[styles.tableCell, { width: 70 }]}>{r.field}</Text>
                      <Text style={[styles.tableCell, { width: 140 }]}>{r.action}</Text>
                    </View>
                  ))} */}
                  <Text>UPCOMING</Text>
                </View>
              </ScrollView>
            </Card>
          </View>

          {/* Yield + Risk forecast */}
          <View style={[styles.twoColRow, isNarrow && { flexDirection: "column" }]}>
            <Card style={styles.flexCol}>
              <SectionTitle n="3" title="Yield Prediction" />
              <Text style={styles.cardHint}>Predict crop yield using AI insights</Text>

              <View style={[styles.rowWrap, { gap: 8, marginBottom: 16 }]}>
                <Dropdown value={crop} options={["Rice (Paddy)", "Wheat", "Maize"]} onChange={setCrop} width={160} />
              </View>

              <View style={[styles.trendRow, isNarrow && { flexDirection: "column" }]}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={styles.cardHint}>Expected Yield</Text>
                  <Text style={styles.yieldValue}>
                    4.2 <Text style={styles.yieldUnit}>tons/acre</Text>
                  </Text>
                  <View style={[styles.rowBetween, { marginTop: 12 }]}>
                    <Text style={styles.legendLabel}>Confidence</Text>
                    <Text style={[styles.legendValue]}>87%</Text>
                  </View>
                  <ProgressBar value={87} color={C.green} />
                  <Text style={styles.footNote}>
                    Previous Estimate: 3.8 tons/acre <Text style={{ color: C.green }}>↑ 10.5%</Text>
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 160, gap: 10 }}>
                  <Text style={styles.cardHint}>Factors Affecting Yield</Text>
                  {[
                    { label: "Crop Health", value: 82, color: C.green },
                    { label: "Soil Moisture", value: 71, color: C.blue },
                    { label: "Pest Pressure", value: 30, color: C.red },
                    { label: "Weather Conditions", value: 80, color: C.purple },
                    { label: "Nutrient Status", value: 65, color: C.amber },
                  ].map((f) => (
                    <View key={f.label}>
                      <View style={[styles.rowBetween, { marginBottom: 3 }]}>
                        <Text style={styles.legendLabel}>{f.label}</Text>
                        <Text style={styles.legendValue}>{f.value}%</Text>
                      </View>
                      <ProgressBar value={f.value} color={f.color} />
                    </View>
                  ))}
                </View>
              </View>
            </Card>

            <Card style={styles.flexCol}>
              <SectionTitle n="4" title="Risk Forecast" />
              <Text style={styles.cardHint}>Forecast potential risks and prepare ahead</Text>

              <View style={{ gap: 12 }}>
                {RISK_FORECAST.map((r) => (
                  <View key={r.name} style={styles.forecastRow}>
                    <r.icon size={16} color={C.amber} />
                    <Text style={styles.forecastLabel} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={r.prob} color={r.level === "High" ? C.red : r.level === "Low" ? C.green : C.amber} />
                    </View>
                    <Text style={styles.forecastPct}>{r.prob}%</Text>
                    <View style={{ width: 90 }}>
                      <Badge label={r.level} color={r.level === "High" ? C.red : r.level === "Low" ? C.green : C.amber} />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.recoBox}>
                <Text style={styles.recoTitle}>Recommendations</Text>
                <View style={{ gap: 6 }}>
                  {RECOMMENDATIONS.map((r) => (
                    <View key={r} style={styles.recoItem}>
                      <Text style={{ color: C.green }}>✓</Text>
                      <Text style={styles.recoText}>{r}</Text>
                    </View>
                  ))}
                </View>
                <Pressable style={styles.primaryBtn} onPress={() => showToast("Opening detailed forecast…")}>
                  <Text style={styles.primaryBtnText}>View Detailed Forecast</Text>
                  <ArrowRight size={12} color="#022c22" />
                </Pressable>
              </View>
            </Card>
          </View>

          {/* Reports + alerts */}
          <View style={[styles.twoColRow, isNarrow && { flexDirection: "column" }]}>
            <Card style={styles.flexCol}>
              <SectionTitle n="5" title="Reports" />
              <Text style={styles.cardHint}>Generate and download detailed reports</Text>

              <Text style={styles.smallLabel}>Select Report Type</Text>
              <View style={[styles.rowWrap, { gap: 8, marginBottom: 16 }]}>
                {REPORT_TYPES.map((rt) => {
                  const Icon = rt.icon;
                  const active = reportType === rt.key;
                  return (
                    <Pressable
                      key={rt.key}
                      onPress={() => toggleReportType(rt.key)}
                      style={[
                        styles.reportTypeBtn,
                        { borderColor: active ? C.borderStrong : C.border, backgroundColor: active ? "rgba(16,185,129,0.1)" : "transparent" },
                      ]}
                    >
                      <Icon size={18} color={active ? C.green : C.textFaint} />
                      <Text style={[styles.reportTypeText, { color: active ? C.textPrimary : C.textDim }]}>{rt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.smallLabel}>Report Preview</Text>
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>{REPORT_TYPES.find((r) => r.key === reportType)?.label}</Text>
                <Text style={styles.footNote}>01 May – 25 May 2025</Text>
                <View style={{ gap: 6, marginTop: 8 }}>
                  {(REPORT_SECTIONS[reportType] || []).map((s) => {
                    const checked = !!checkedSections[s];
                    return (
                      <Pressable key={s} style={styles.checkboxRow} onPress={() => toggleSection(s)}>
                        <View style={[styles.checkbox, checked && { backgroundColor: C.green, borderColor: C.green }]}>
                          {checked && <Check size={11} color="#022c22" />}
                        </View>
                        <Text style={styles.legendLabel}>{s}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Text style={styles.smallLabel}>Export Options</Text>
              <View style={[styles.rowWrap, { gap: 8, marginBottom: 12 }]}>
                <Pressable style={[styles.exportBtn, { backgroundColor: "rgba(248,113,113,0.12)" }]} onPress={() => showToast("Downloading PDF…")}>
                  <FileType2 size={13} color="#fca5a5" />
                  <Text style={[styles.exportText, { color: "#fca5a5" }]}>PDF</Text>
                </Pressable>
                <Pressable style={[styles.exportBtn, { backgroundColor: "rgba(52,211,153,0.12)" }]} onPress={() => showToast("Downloading Excel…")}>
                  <FileSpreadsheet size={13} color="#6ee7b7" />
                  <Text style={[styles.exportText, { color: "#6ee7b7" }]}>Excel</Text>
                </Pressable>
                <Pressable style={[styles.exportBtn, { backgroundColor: "rgba(56,189,248,0.12)" }]} onPress={() => showToast("Downloading CSV…")}>
                  <Download size={13} color="#7dd3fc" />
                  <Text style={[styles.exportText, { color: "#7dd3fc" }]}>CSV</Text>
                </Pressable>
              </View>
              <Pressable style={styles.primaryBtnFull} onPress={() => showToast("Report generated")}>
                <Text style={styles.primaryBtnText}>Generate Report</Text>
              </Pressable>
            </Card>

            <Card style={styles.flexCol}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleText}>Recent Alerts</Text>
                {/* <Pressable onPress={() => setActiveNav("alerts")}>
                  <Text style={styles.linkText}>View All</Text>
                </Pressable> */}
              </View>
              <View style={{ marginTop: 12 }}>
                {ALERTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <View key={a.id} style={styles.alertRow}>
                      <View
                        style={[
                          styles.alertIconWrap,
                          { backgroundColor: a.tone === "danger" ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)" },
                        ]}
                      >
                        <Icon size={15} color={a.tone === "danger" ? "#fca5a5" : "#fcd34d"} />
                      </View>
                      <Text style={styles.alertTitle}>{a.title}</Text>
                      <Text style={styles.alertTime}>{a.time}</Text>
                    </View>
                  );
                })}
              </View>
              {/* <Pressable style={styles.primaryBtnFull} onPress={() => setActiveNav("alerts")}>
                <Text style={styles.primaryBtnText}>Go to Alerts</Text>
              </Pressable> */}
            </Card>
          </View>

          {/* {activeNav !== "overview" && (
            // <Text style={styles.placeholderNote}>
            //   Showing the {NAV_ITEMS.find((n) => n.key === activeNav)?.label} view — wire this section up to real data next.
            // </Text>
          )} */}

          <Text style={styles.footerText}>CultivaX — Empowering Farmers with AI, Data and Actionable Insights</Text>
        </ScrollView>
      </View>
      {notifOpen && (
        <>
             <Pressable
      style={styles.notifBackdrop}
      onPress={closeNotif}
    />
                   <View style={[styles.notifPanel, { top: insets.top + 56 }]}>
                    {ALERTS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <View key={a.id} style={styles.notifItem}>
                          <Icon size={16} color={C.amber} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.notifTitle}>{a.title}</Text>
                            <Text style={styles.notifTime}>{a.time}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View> 
                  </>
                )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: C.page },
  body: { flex: 1, minHeight: 0, flexDirection: "row", overflow: "hidden", position: "relative" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBackdropTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalDropdown: { width: 220, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardAlt, padding: 8, gap: 4 },
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
topBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
h1: { fontSize: 22, fontWeight: "700", color: C.textPrimary },
  headerSub: { fontSize: 13, color: C.textDim, marginTop: 4 },

  pillCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  pillMain: { fontSize: 12, color: C.textPrimary, fontWeight: "600" },
  pillSub: { fontSize: 10, color: C.textFaint },

  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 999, backgroundColor: C.red, alignItems: "center", justifyContent: "center" },
  notifDotText: { color: "white", fontSize: 9, fontWeight: "700" },
  notifBackdrop: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.3)",
  zIndex: 9998,
},
notifPanel: { position: "absolute", right: 20, width: 280, zIndex: 9999, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 8, gap: 4 },
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

  sectionTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8 },
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

  chartLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -40, paddingHorizontal: 4 },
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