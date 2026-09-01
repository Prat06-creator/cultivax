import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


import { getSensorHistory, type SensorHistoryResponse } from "../services/api";
import {useRouter} from 'expo-router'
import Sidebar from "@/components/sidebar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle } from 'react-native-svg';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FileText,History, Gauge, Home, MessageCircle, Sprout, TrendingUp, Camera } from 'lucide-react-native';
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
//Theme
const COLORS = {
  bg: '#07140D',
  card: '#0E2019',
  cardBorder: '#1B3A2A',
  accent: '#3ED65C',
  accentSoft: 'rgba(62,214,92,0.15)',
  text: '#F2F5F3',
  subtext: '#8FA396',
  faintText: '#5C7368',
  chip: '#12281C',
  chipActive: '#3ED65C',
  danger: '#EF6A5F',
  blue: '#4FA3E3',
  purple: '#9E7BE0',
  orange: '#F0A93B',
};
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
  yellow: "#fbbf24",
  white: "#fff",
};
//Types
type ParameterKey =
  | 'cropHealth'
  | 'soilMoisture'
  | 'temperature'
  | 'humidity'
  | 'altitude'
  | 'lightIntensity';

  type DurationKey =
  | "1d"
  | "3d"
  | "7d"
  | "1m"
  | "3m"
  | "6m"
  | "1y";

interface ParameterConfig {
  key: ParameterKey;
  label: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  min: number;
  max: number;
  decimals: number;
}

const PARAMETERS: ParameterConfig[] = [
  {
    key: 'cropHealth',
    label: 'Crop Health',
    unit: '%',
    icon: <Ionicons name="leaf" size={16} color={COLORS.accent} />,
    color: COLORS.accent,
    min: 30,
    max: 95,
    decimals: 0,
  },
  {
    key: 'soilMoisture',
    label: 'Soil Moisture',
    unit: '%',
    icon: <Ionicons name="water" size={16} color={COLORS.blue} />,
    color: COLORS.blue,
    min: 20,
    max: 90,
    decimals: 0,
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    icon: <Feather name="thermometer" size={16} color={COLORS.danger} />,
    color: COLORS.danger,
    min: 18,
    max: 38,
    decimals: 1,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    icon: <Ionicons name="water-outline" size={16} color={COLORS.blue} />,
    color: COLORS.blue,
    min: 30,
    max: 85,
    decimals: 0,
  },
  {
    key: 'altitude',
    label: 'Altitude',
    unit: 'm',
    icon: <MaterialCommunityIcons name="image-filter-hdr" size={16} color={COLORS.accent} />,
    color: COLORS.accent,
    min: 130,
    max: 175,
    decimals: 0,
  },
  {
    key: 'lightIntensity',
    label: 'Light Intensity',
    unit: 'lux',
    icon: <Ionicons name="sunny" size={16} color={COLORS.orange} />,
    color: COLORS.orange,
    min: 200,
    max: 950,
    decimals: 0,
  },
];

interface DurationConfig {
  key: DurationKey;
  label: string;
}

const DURATIONS: DurationConfig[] = [
  { key: "1d", label: "1 Day" },
  { key: "3d", label: "3 Days" },
  { key: "7d", label: "7 Days" },
  { key: "1m", label: "1 Month" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
];





// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------
const screenWidth = Dimensions.get('window').width;

export default function TrendsScreen() {

  const [historyData, setHistoryData] =
  useState<SensorHistoryResponse | null>(null);

const [loading, setLoading] = useState(false);

const [error, setError] = useState<string | null>(null);
// const [selectedDuration, setSelectedDuration] =
  // useState<DurationConfig>(DURATIONS[0]);
  const [selectedDuration, setSelectedDuration] = useState<DurationConfig>(DURATIONS[2]); // 7 Days default

useEffect(() => {
  fetchHistory();
}, [selectedDuration]);
const fetchHistory = async () => {
  try {
    setLoading(true);
    setError(null);

    const data = await getSensorHistory(
      selectedDuration.key
    );

    setHistoryData(data);
  } catch (error) {
    console.error("History API error:", error);

    setError("Unable to load sensor data");
    setHistoryData(null);
  } finally {
    setLoading(false);
  }
};





  const router = useRouter();
  const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const isNarrow = screenWidth < 900;
   const [toast, setToast] = useState<string | null>(null);
   const [activeNav, setActiveNav] = useState<string>("trends");
   const [sidebarOpen, setSidebarOpen] = useState(!isNarrow);
  const [selectedParam, setSelectedParam] = useState<ParameterConfig>(PARAMETERS[0]);
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const chartShotRef = useRef<ViewShot>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labels = useMemo(() => {
    if (!historyData) return [];
  
    return historyData.points.map((point) => {
      const date = new Date(point.period);
  
      if (selectedDuration.key === "1d") {
        return date.toLocaleTimeString("en-IN", {
          hour: "numeric",
          hour12: true,
        });
      }
  
      if (
        selectedDuration.key === "3d" ||
        selectedDuration.key === "7d" ||
        selectedDuration.key === "1m"
      ) {
        return date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
      }
  
      return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
    });
  }, [historyData, selectedDuration]);
  
  const values = useMemo<number[]>(() => {
    if (!historyData) return [];

    return historyData.points.map((point) => {
      switch (selectedParam.key) {
        case "soilMoisture":
          return typeof point.soil_moisture === "number" ? point.soil_moisture : Number.NaN;

        case "temperature":
          return typeof point.temperature === "number" ? point.temperature : Number.NaN;

        case "humidity":
          return typeof point.humidity === "number" ? point.humidity : Number.NaN;

        case "altitude":
          return typeof point.altitude === "number" ? point.altitude : Number.NaN;

        case "lightIntensity":
          return typeof point.light_intensity === "number" ? point.light_intensity : Number.NaN;

        case "cropHealth":
          return Number.NaN;

        default:
          return Number.NaN;
      }
    });
  }, [historyData, selectedParam]);

  const getValueAtIndex = (index: number): number => {
    const value = values[index];
    return typeof value === "number" && !Number.isNaN(value) ? value : 0;
  };

  // Thin out x-axis labels so long ranges (1 Month / 1 Year) stay readable
  const displayLabels = useMemo(() => {
    const maxTicks = 7;
    if (labels.length <= maxTicks) return labels;
    const step = Math.ceil(labels.length / maxTicks);
    return labels.map((l, i) => (i % step === 0 ? l : ''));
  }, [labels]);

  const validValues = useMemo(() => {
    return values.filter(
      (value): value is number =>
        value !== null && !Number.isNaN(value)
    );
  }, [values]);
  
  const stats = useMemo(() => {
    // No valid sensor data
    if (validValues.length === 0) {
      return {
        max: 0,
        min: 0,
        avg: 0,
        trend: 0,
        dataPoints: 0,
        maxLabel: "",
        minLabel: "",
      };
    }
  
    const max = Math.max(...validValues);
    const min = Math.min(...validValues);
  
    const avg =
      validValues.reduce(
        (sum, value) => sum + value,
        0
      ) / validValues.length;
  
    // First and last ACTUAL values,
    // ignoring null/missing hours.
    const first = validValues[0];
    const last = validValues[validValues.length - 1];
  
    const trend =
      first === 0
        ? 0
        : ((last - first) / Math.abs(first)) * 100;
  
    // Find labels corresponding to max/min
    const maxIdx = values.findIndex(
      (value) => value === max
    );
  
    const minIdx = values.findIndex(
      (value) => value === min
    );
  
    return {
      max,
      min,
      avg,
      trend,
      dataPoints: validValues.length,
  
      maxLabel:
        maxIdx >= 0 ? labels[maxIdx] : "",
  
      minLabel:
        minIdx >= 0 ? labels[minIdx] : "",
    };
  }, [values, validValues, labels]);
  const fmt = (v: number) =>
    `${selectedParam.decimals === 0 ? Math.round(v) : v.toFixed(1)}${selectedParam.unit}`;

  const handleDataPointClick = (data: {
    value: number;
    dataset: any;
    index: number;
    x: number;
    y: number;
  }) => {
    setTooltip({
      visible: true,
      x: data.x,
      y: data.y,
      label: labels[data.index],
      value: data.value,
    });
  };
 const handleDataPointHover = (x: number, y: number, index: number) => {
  if (tooltipHideTimer.current) {
    clearTimeout(tooltipHideTimer.current);
    tooltipHideTimer.current = null;
  }
  setTooltip({
    visible: true,
    x,
    y,
    label: labels[index],
    value: values[index],
  });
};
const handleDataPointLeave = () => {
  tooltipHideTimer.current = setTimeout(() => {
    setTooltip(null);
    tooltipHideTimer.current = null;
  }, 1000); // stays visible for at least 1s after the mouse leaves
};
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }
  // ---- Export to PDF -----------------------------------------------
  const handleExport = async () => {
    try {
      setExporting(true);

      let chartImageTag = '';
      if (chartShotRef.current?.capture) {
        const uri = await chartShotRef.current.capture();
        // expo-print accepts local file uris directly as <img src="..."> on native
        chartImageTag = `<img src="${uri}" style="width:100%;border-radius:12px;margin:16px 0;" />`;
      }

      const rowsHtml = labels
        .map(
          (l, i) =>
            `<tr><td style="padding:6px 10px;border-bottom:1px solid #22382c;">${
              l || `Point ${i + 1}`
            }</td><td style="padding:6px 10px;border-bottom:1px solid #22382c;text-align:right;">${fmt(
              values[i]
            )}</td></tr>`
        )
        .join('');

      const html = `
        <html>
          <head><meta charset="utf-8" /></head>
          <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#0A1A12;color:#EAF2ED;padding:24px;">
            <h1 style="color:#3ED65C;margin-bottom:0;">CultivaX — Trends Report</h1>
            <p style="color:#8FA396;margin-top:4px;">${selectedParam.label} · ${selectedDuration.label} · Generated ${new Date().toLocaleString()}</p>
            ${chartImageTag}
            <h3 style="margin-top:24px;">Summary (${selectedDuration.label})</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              <tr>
                <td style="padding:6px 10px;">Max Value</td>
                <td style="padding:6px 10px;text-align:right;font-weight:bold;color:#3ED65C;">${fmt(
                  stats.max
                )} (${stats.maxLabel})</td>
              </tr>
              <tr>
                <td style="padding:6px 10px;">Min Value</td>
                <td style="padding:6px 10px;text-align:right;font-weight:bold;color:#EF6A5F;">${fmt(
                  stats.min
                )} (${stats.minLabel})</td>
              </tr>
              <tr>
                <td style="padding:6px 10px;">Average</td>
                <td style="padding:6px 10px;text-align:right;font-weight:bold;">${fmt(stats.avg)}</td>
              </tr>
              <tr>
                <td style="padding:6px 10px;">Trend</td>
                <td style="padding:6px 10px;text-align:right;font-weight:bold;">${
                  stats.trend >= 0 ? '+' : ''
                }${stats.trend.toFixed(1)}%</td>
              </tr>
              <tr>
                <td style="padding:6px 10px;">Data Points</td>
                <td style="padding:6px 10px;text-align:right;font-weight:bold;">${stats.dataPoints}</td>
              </tr>
            </table>
            <h3>Raw Data</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #3ED65C;">Time</th>
                <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #3ED65C;">${
                  selectedParam.label
                }</th>
              </tr>
              ${rowsHtml}
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Trends Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback for platforms without a share sheet (e.g. some web/dev setups)
        await Print.printAsync({ uri });
      }
    } catch (err) {
      console.warn('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const chartData = {
    labels: displayLabels,
    datasets: [
      {
        data: values,
        color: (opacity = 1) =>
          hexToRgba(selectedParam.color, opacity),
        strokeWidth: 3,
      },
    ],
  };

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
          showToast={showToast}
        />
    

    <View style={[styles.screen, { top: insets.top + 3 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Trends</Text>
            <Text style={styles.subtitle}>Track key parameters and patterns over time.</Text>
          </View>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Feather name="download" size={16} color={COLORS.text} />
            )}
            <Text style={styles.exportBtnText}>{exporting ? 'Exporting…' : 'Export'}</Text>
          </TouchableOpacity>
        </View>

        {/* Filters row */}
<View style={[styles.filtersRow, { zIndex: pickerVisible ? 30 : 1 }]}>
          {/* Parameter dropdown */}
          {/* Parameter dropdown */}
<View style={[styles.card, styles.filterCard, { position: 'relative', zIndex: pickerVisible ? 30 : 1 }]}>
  <Text style={styles.filterLabel}>Select Parameter</Text>
  <TouchableOpacity
    style={styles.dropdownTrigger}
    onPress={() => setPickerVisible((v) => !v)}
    activeOpacity={0.8}
  >
    <View style={styles.dropdownTriggerLeft}>
      {selectedParam.icon}
      <Text style={styles.dropdownTriggerText}>{selectedParam.label}</Text>
    </View>
    <Ionicons
      name={pickerVisible ? 'chevron-up' : 'chevron-down'}
      size={18}
      color={COLORS.subtext}
    />
  </TouchableOpacity>

  {pickerVisible && (
    <View style={styles.inlineDropdown}>
      {PARAMETERS.map((p) => {
  let value: number | null = null;

  if (historyData?.points?.length) {
    const validValues = historyData.points
      .map((point) => {
        switch (p.key) {
          case "soilMoisture":
            return point.soil_moisture;

          case "temperature":
            return point.temperature;

          case "humidity":
            return point.humidity;

          case "altitude":
            return point.altitude;

          case "lightIntensity":
            return point.light_intensity;

          default:
            return null;
        }
      })
      .filter(
        (v): v is number =>
          v !== null && !Number.isNaN(v)
      );

    if (validValues.length > 0) {
      value =
        validValues.reduce((a, b) => a + b, 0) /
        validValues.length;
    }
  }

  return (
    <TouchableOpacity
      key={p.key}
      style={styles.averageRow}
      activeOpacity={0.7}
      onPress={() => setSelectedParam(p)}
    >
      <View style={styles.averageRowLeft}>
        {p.icon}

        <Text style={styles.averageRowLabel}>
          {p.label}
        </Text>
      </View>

      <Text style={styles.averageRowValue}>
        {value !== null
          ? `${p.decimals === 0
              ? Math.round(value)
              : value.toFixed(p.decimals)}${p.unit}`
          : "No data"}
      </Text>
    </TouchableOpacity>
  );
})}
    </View>
  )}
</View>
          {/* Duration */}
          <View style={[styles.card, styles.filterCard, { flex: 1.4 }]}>
            <Text style={styles.filterLabel}>Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => {
                  const active = d.key === selectedDuration.key;
                  return (
                    <TouchableOpacity
                      key={d.key}
                      style={[styles.durationChip, active && styles.durationChipActive]}
                      onPress={() => {
                        setSelectedDuration(d);
                        setTooltip(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          active && styles.durationChipTextActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Chart + Averages row */}
        <View style={[styles.mainRow, { zIndex: 1 }]}>
          {/* Chart card */}
          <View style={[styles.card, styles.chartCard]}>
            <View style={styles.chartHeaderRow}>
              {selectedParam.icon}
              <Text style={styles.chartTitle}>{selectedParam.label} Trend</Text>
            </View>

            {/* <ViewShot
              ref={chartShotRef}
              options={{ format: 'png', quality: 0.9 }}
              style={{ backgroundColor: COLORS.card }}
            >
              <View>
                <LineChart
                  data={chartData}
                  width={Math.min(screenWidth - 48, 720)}
                  height={260}
                  bezier
                  fromZero={selectedParam.key !== 'temperature' && selectedParam.key !== 'altitude'}
                  withInnerLines
                  withOuterLines={false}
                  withShadow={false}
                  onDataPointClick={handleDataPointClick}
                renderDotContent={({ x, y, index }) => (
  <Circle
    key={`hover-${index}`}
    cx={x}
    cy={y}
    r={14}
    fill="transparent"
    onPress={() => handleDataPointHover(x, y, index)}
    // @ts-ignore — web-only mouse events; react-native-svg forwards these
    // to the underlying DOM <circle> element on web, ignored on native
    onMouseEnter={() => handleDataPointHover(x, y, index)}
    // @ts-ignore
    onMouseLeave={handleDataPointLeave}
  />
)}
                  chartConfig={{
                    backgroundColor: COLORS.card,
                    backgroundGradientFrom: COLORS.card,
                    backgroundGradientTo: COLORS.card,
                    decimalPlaces: selectedParam.decimals,
                    color: (opacity = 1) => hexToRgba(selectedParam.color, opacity),
                    labelColor: () => COLORS.subtext,
                    propsForBackgroundLines: {
                      stroke: '#173226',
                      strokeDasharray: '4 6',
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: selectedParam.color,
                      fill: COLORS.card,
                    },
                    fillShadowGradientFrom: selectedParam.color,
                    fillShadowGradientFromOpacity: 0.35,
                    fillShadowGradientTo: COLORS.card,
                    fillShadowGradientToOpacity: 0.02,
                  }}
                  style={styles.chart}
                />

                {tooltip?.visible && (
                  <View
                    style={[
                      styles.tooltip,
                      {
                        left: Math.max(4, Math.min(tooltip.x - 70, (screenWidth - 48) - 150)),
                        top: Math.max(0, tooltip.y - 58),
                      },
                    ]}
                  >
                    <Text style={styles.tooltipDate}>{tooltip.label}</Text>
                    <View style={styles.tooltipValueRow}>
                      <View style={[styles.tooltipDot, { backgroundColor: selectedParam.color }]} />
                      <Text style={styles.tooltipLabel}>{selectedParam.label}</Text>
                      <Text style={styles.tooltipValue}>{fmt(tooltip.value)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </ViewShot> */}
       

<View
  onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
  style={{ width: '100%', position: 'relative' }}
>
  {chartWidth > 0 && (
    <>
      {/* Only THIS inner wrapper clips — keeps the chart from bleeding past the card */}
      <View style={{ width: chartWidth, overflow: 'hidden', borderRadius: 12 }}>
        <ViewShot
          ref={chartShotRef}
          options={{ format: 'png', quality: 0.9 }}
          style={{ backgroundColor: COLORS.card }}
        >
          <LineChart
            data={chartData}
            width={chartWidth}
            height={260}
            bezier
            fromZero={selectedParam.key !== 'temperature' && selectedParam.key !== 'altitude'}
            withInnerLines
            withOuterLines={false}
            withShadow={false}
            onDataPointClick={handleDataPointClick}
            renderDotContent={({ x, y, index }) => (
              <Circle
                key={`hover-${index}`}
                cx={x}
                cy={y}
                r={18} // bigger touch target for fingers vs mouse cursor
                fill="rgba(0,0,0,0.01)" // NOT "transparent" — react-native-svg often
                                        // won't register touch/press on a literal transparent fill
                onPress={() => handleDataPointHover(x, y, index)}
                // @ts-ignore — web-only, ignored on native
                onMouseEnter={() => handleDataPointHover(x, y, index)}
                // @ts-ignore
                onMouseLeave={handleDataPointLeave}
              />
            )}
            chartConfig={{
              backgroundColor: COLORS.card,
              backgroundGradientFrom: COLORS.card,
              backgroundGradientTo: COLORS.card,
              decimalPlaces: selectedParam.decimals,
              color: (opacity = 1) => hexToRgba(selectedParam.color, opacity),
              labelColor: () => COLORS.subtext,
              propsForBackgroundLines: { stroke: '#173226', strokeDasharray: '4 6' },
              propsForDots: { r: '4', strokeWidth: '2', stroke: selectedParam.color, fill: COLORS.card },
              fillShadowGradientFrom: selectedParam.color,
              fillShadowGradientFromOpacity: 0.35,
              fillShadowGradientTo: COLORS.card,
              fillShadowGradientToOpacity: 0.02,
              propsForLabels: { fontSize: isNarrow ? 10 : 12 }, // shrinks x-axis labels a bit
                                                                  // so "31 Aug" doesn't push past the edge
            }}
            style={styles.chart}
          />
        </ViewShot>
      </View>

      {/* Tooltip lives OUTSIDE the overflow:hidden box, so it never gets clipped near the edges */}
      {tooltip?.visible && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: Math.max(4, Math.min(tooltip.x - 70, chartWidth - 150)),
              top: Math.max(0, tooltip.y - 58),
            },
          ]}
        >
          <Text style={styles.tooltipDate}>{tooltip.label}</Text>
          <View style={styles.tooltipValueRow}>
            <View style={[styles.tooltipDot, { backgroundColor: selectedParam.color }]} />
            <Text style={styles.tooltipLabel}>{selectedParam.label}</Text>
            <Text style={styles.tooltipValue}>{fmt(tooltip.value)}</Text>
          </View>
        </View>
      )}
    </>
  )}
</View>     
            <Text style={styles.tapHint}>
  {Platform.OS === 'web'
    ? 'Hover over a point on the line to see its value'
    : 'Tap a point on the line to see its value'}
</Text>
          </View>

          {/* Average values panel */}
          <View style={[styles.card, styles.averagesCard]}>
            <Text style={styles.averagesTitle}>Average Values</Text>
            {PARAMETERS.map((p) => {
  let value: number | null = null;

  if (historyData?.points?.length) {
    const sensorValues = historyData.points
      .map((point) => {
        switch (p.key) {
          case "soilMoisture":
            return point.soil_moisture;

          case "temperature":
            return point.temperature;

          case "humidity":
            return point.humidity;

          case "altitude":
            return point.altitude;

          case "lightIntensity":
            return point.light_intensity;

          case "cropHealth":
            return null;

          default:
            return null;
        }
      })
      .filter(
        (v): v is number =>
          v !== null && !Number.isNaN(v)
      );

    if (sensorValues.length > 0) {
      value =
        sensorValues.reduce(
          (sum, current) => sum + current,
          0
        ) / sensorValues.length;
    }
  }

  return (
    <TouchableOpacity
      key={p.key}
      style={styles.averageRow}
      activeOpacity={0.7}
      onPress={() => setSelectedParam(p)}
    >
      <View style={styles.averageRowLeft}>
        {p.icon}

        <Text style={styles.averageRowLabel}>
          {p.label}
        </Text>
      </View>

      <Text style={styles.averageRowValue}>
        {value === null
          ? "No data"
          : `${p.decimals === 0
              ? Math.round(value)
              : value.toFixed(p.decimals)}${p.unit}`}
      </Text>
    </TouchableOpacity>
  );
})}
          </View>
        </View>

        {/* Summary strip */}
        <View style={[styles.card, styles.summaryCard]}>
          <Text style={styles.summaryTitle}>Summary ({selectedDuration.label})</Text>
          <View style={styles.summaryGrid}>
            <SummaryItem
              label="Max Value"
              value={fmt(stats.max)}
              sub={stats.maxLabel}
              valueColor={COLORS.accent}
              icon={<Feather name="arrow-up" size={14} color={COLORS.accent} />}
            />
            <SummaryItem
              label="Min Value"
              value={fmt(stats.min)}
              sub={stats.minLabel}
              valueColor={COLORS.danger}
              icon={<Feather name="arrow-down" size={14} color={COLORS.danger} />}
            />
            <SummaryItem
              label="Average"
              value={fmt(stats.avg)}
              sub=""
              valueColor={COLORS.text}
              icon={<Ionicons name="pulse" size={14} color={COLORS.blue} />}
            />
            <SummaryItem
              label="Trend"
              value={`${stats.trend >= 0 ? '+' : ''}${stats.trend.toFixed(1)}%`}
              sub={`vs last ${selectedDuration.label.toLowerCase()}`}
              valueColor={stats.trend >= 0 ? COLORS.accent : COLORS.danger}
              icon={
                <Feather
                  name={stats.trend >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={stats.trend >= 0 ? COLORS.accent : COLORS.danger}
                />
              }
            />
            <SummaryItem
              label="Data Points"
              value={`${stats.dataPoints}`}
              sub={selectedDuration.label}
              valueColor={COLORS.text}
              icon={<Ionicons name="server" size={14} color={COLORS.purple} />}
            />
          </View>
        </View>
    

      {/* Parameter picker modal */}
      {/* <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Parameter</Text>
            <FlatList
              data={PARAMETERS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                const active = item.key === selectedParam.key;
                return (
                  <TouchableOpacity
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => {
                      setSelectedParam(item);
                      setPickerVisible(false);
                      setTooltip(null);
                    }}
                  >
                    {item.icon}
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && { color: COLORS.accent, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.accent}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>  */}
  </ScrollView>
    </View>
    </View>
    </View>
  );
}

// ----------------------------------------------------------------------
// Small subcomponent
// ----------------------------------------------------------------------
function SummaryItem({
  label,
  value,
  sub,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryItemHeader}>
        <Text style={styles.summaryItemLabel}>{label}</Text>
        <View style={styles.summaryIconBubble}>{icon}</View>
      </View>
      <Text style={[styles.summaryItemValue, { color: valueColor }]}>{value}</Text>
      {!!sub && <Text style={styles.summaryItemSub}>{sub}</Text>}
    </View>
  );
}

// ----------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------
function hexToRgba(hex: string, opacity: number) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${opacity})`;
}

// ----------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0,height: '100%', backgroundColor: C.page },
  body: { flex: 1, minHeight: 0, flexDirection: "row", overflow: "hidden", position: "relative" },
  sidebarWrap: {
    flexShrink: 0,
    flexGrow: 0,
    height: '100%',
    overflow: 'hidden',
  },
  screen: { flex: 1, backgroundColor: C.page },
  scrollContent: { padding: 20, paddingBottom: 48 },
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: COLORS.subtext, fontSize: 13, marginTop: 4 },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  exportBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },

  filtersRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
    marginBottom: 16,
  },
  filterCard: { flex: 1 },
  filterLabel: { color: COLORS.subtext, fontSize: 12, marginBottom: 10 },
  inlineDropdown: {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 6,
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.cardBorder,
  borderRadius: 12,
  paddingVertical: 6,
  paddingHorizontal: 6,
  zIndex: 30,
  shadowColor: '#000',
  shadowOpacity: 0.3,
  shadowRadius: 10,
  elevation: 8,
  maxHeight: 320,
},
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.chip,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownTriggerText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

  durationRow: { flexDirection: 'row', gap: 8 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.chip,
  },
  durationChipActive: { backgroundColor: COLORS.chipActive },
  durationChipText: { color: COLORS.subtext, fontSize: 13, fontWeight: '600' },
  durationChipTextActive: { color: '#07140D' },

  mainRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
    marginBottom: 16,
  },
  chartCard: {
  flex: Platform.OS === 'web' ? 3 : undefined,
  width: Platform.OS === 'web' ? undefined : '100%',
},
  chartHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chartTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  chart: { borderRadius: 12 },
  tapHint: { color: COLORS.faintText, fontSize: 11, marginTop: 6, textAlign: 'center' },

  tooltip: {
    position: 'absolute',
    backgroundColor: '#0C2318',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tooltipDate: { color: COLORS.subtext, fontSize: 11, marginBottom: 4 },
  tooltipValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tooltipDot: { width: 8, height: 8, borderRadius: 4 },
  tooltipLabel: { color: COLORS.text, fontSize: 12, marginRight: 6 },
  tooltipValue: { color: COLORS.text, fontSize: 13, fontWeight: '800' },

  averagesCard: { flex: 1.2 },
  averagesTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#152B20',
  },
  averageRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  averageRowLabel: { color: COLORS.subtext, fontSize: 13 },
  averageRowValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },

  summaryCard: {},
  summaryTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: COLORS.chip,
    borderRadius: 12,
    padding: 12,
  },
  summaryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryItemLabel: { color: COLORS.subtext, fontSize: 12 },
  summaryIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItemValue: { fontSize: 20, fontWeight: '800' },
  summaryItemSub: { color: COLORS.faintText, fontSize: 11, marginTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalOptionActive: { backgroundColor: COLORS.accentSoft },
  modalOptionText: { color: COLORS.text, fontSize: 14 },
});
