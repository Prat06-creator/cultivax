import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Camera, FileText, Gauge, Home, MessageCircle, Sprout, TrendingUp, History, CameraOff} from 'lucide-react-native';
import Sidebar from '@/components/sidebar';
// ---------- Theme ----------
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
const COLORS = {
  bg: '#0a1410',
  card: '#0f1f17',
  cardBorder: '#1e3a2a',
  accent: '#4ade80',
  accentDark: '#16a34a',
  accentDim: 'rgba(74, 222, 128, 0.12)',
  text: '#f1f5f2',
  subtext: '#8ba396',
  danger: '#ef4444',
  dangerDim: 'rgba(239, 68, 68, 0.12)',
  warning: '#f59e0b',
  warningDim: 'rgba(245, 158, 11, 0.12)',
  success: '#22c55e',
  successDim: 'rgba(34, 197, 94, 0.12)',
  divider: '#16281e',
};

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
// ---------- Types ----------
type RiskLevel = 'Extremely High' | 'High' | 'Medium' | 'Low';

interface OtherCondition {
  name: string;
  confidence: number;
}

interface AnalysisResult {
  condition: string;
  confidence: number;
  riskLevel: RiskLevel;
  riskMessage: string;
  otherConditions: OtherCondition[];
}

interface RecommendedAction {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface UploadedImageEntry {
  id: string;
  uri: string;
  label: string;
  date: string;
  risk: RiskLevel;
}

// ---------- Mock data ----------
// const MOCK_RESULT: AnalysisResult = {
//   condition: 'Tomato – Early Blight',
//   confidence: 78,
//   riskLevel: 'High',
//   riskMessage:
//     'This condition has a high risk of spreading and may cause significant yield loss.',
//   otherConditions: [
//     { name: 'Septoria Leaf Spot', confidence: 42 },
//     { name: 'Bacterial Leaf Spot', confidence: 28 },
//     { name: 'Leaf Mold', confidence: 15 },
//     { name: 'Target Spot', confidence: 10 },
//   ],
// };

const RECOMMENDED_ACTIONS: RecommendedAction[] = [
  {
    icon: 'cut-outline',
    title: 'Remove infected leaves',
    description: 'Remove and dispose of infected leaves to prevent the spread.',
  },
  {
    icon: 'flask-outline',
    title: 'Apply fungicide',
    description: 'Use recommended fungicide: Chlorothalonil 75% WP at 2.5 g/L of water.',
  },
  {
    icon: 'leaf-outline',
    title: 'Improve air circulation',
    description: 'Ensure proper spacing between plants to improve airflow.',
  },
  {
    icon: 'search-outline',
    title: 'Monitor regularly',
    description: 'Check plants every 2–3 days and monitor for new symptoms.',
  },
  {
    icon: 'trash-outline',
    title: 'Maintain field hygiene',
    description: 'Remove plant debris and keep the field clean.',
  },
];

const HISTORY: UploadedImageEntry[] = [
  { id: '1', uri: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=200', label: 'Tomato Leaf', date: '24 May 2025, 10:30 AM', risk: 'High' },
  { id: '2', uri: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=200', label: 'Potato Leaf', date: '23 May 2025, 06:15 PM', risk: 'Medium' },
  { id: '3', uri: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200', label: 'Chili Leaf', date: '22 May 2025, 09:45 AM', risk: 'Low' },
  { id: '4', uri: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=200', label: 'Tomato Leaf', date: '21 May 2025, 04:20 PM', risk: 'Medium' },
  { id: '5', uri: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200', label: 'Grapevine Leaf', date: '20 May 2025, 11:05 AM', risk: 'Low' },
  { id: '6', uri: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=200', label: 'Cucumber Leaf', date: '19 May 2025, 08:50 AM', risk: 'High' },
];

// ---------- Helpers ----------
const riskColors = (risk: RiskLevel) => {
  switch (risk) {
    case 'High':
      return { text: COLORS.danger, bg: COLORS.dangerDim };
    case 'Medium':
      return { text: COLORS.warning, bg: COLORS.warningDim };
    case 'Low':
      return { text: COLORS.success, bg: COLORS.successDim };
  }
};

// ---------- Component ----------
export default function ImageDiagnosis() {
    const insets = useSafeAreaInsets();
     const { width : screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= 900;
    const isNarrow = screenWidth < 900;
    const [toast, setToast] = useState<string | null>(null);
      const [activeNav, setActiveNav] = useState<(typeof NAV_ITEMS)[number]["key"]>("image");
      const [sidebarOpen, setSidebarOpen] = useState(!isNarrow);
      const [chatsPanelOpen, setChatsPanelOpen] = useState(!isNarrow);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'actions'>('analysis');
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<View>(null);
    function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }
  // ----- Image pickers -----
  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && Platform.OS !== 'web') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload an image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setResult(null);
  };

  const analyseImage = async () => {
    if (!imageUri) {
      Alert.alert(
        'No image selected',
        'Please upload a plant image first.'
      );
      return;
    }
  
    setIsAnalysing(true);
    setResult(null);
  
    try {
      const formData = new FormData();
  
      if (Platform.OS === 'web') {
        // On web, imageUri is a blob URL
        const imageResponse = await fetch(imageUri);
        const blob = await imageResponse.blob();
  
        formData.append(
          'image',
          blob,
          'plant-image.jpg'
        );
      } else {
        // Android / iOS
        formData.append(
          'image',
          {
            uri: imageUri,
            name: 'plant-image.jpg',
            type: 'image/jpeg',
          } as any
        );
      }
  
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
  
      const response = await fetch(
        `${API_BASE_URL}/disease/predict`,
        {
          method: 'POST',
          body: formData,
        }
      );
  
      const data = await response.json();
  
      console.log('Disease API response:', data);
  
      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || 'Disease detection failed'
        );
      }
  
      const prediction = data.prediction;
  
      // -----------------------------------------
      // Convert backend class name for UI
      // -----------------------------------------
  
      const formatDiseaseName = (className: string) => {
        return className
          .replace('Tomato___', '')
          .replaceAll('_', ' ')
          .trim();
      };
  
      const condition = formatDiseaseName(
        prediction.predicted_class
      );
  
      // Backend confidence is 0-1
      // UI expects percentage 0-100
      const confidence =
        prediction.confidence * 100;
  
      // -----------------------------------------
      // Other predictions
      // -----------------------------------------
  
      const otherConditions =
        prediction.top_predictions
          .slice(1)
          .map((item: any) => ({
            name: formatDiseaseName(item.class_name),
            confidence: item.confidence * 100,
          }));
  
      // -----------------------------------------
      // Temporary risk interpretation
      // -----------------------------------------
  
      let riskLevel: RiskLevel;
  
      if (confidence >= 90) {
        riskLevel = 'Extremely High';
      } else if (confidence >= 70) {
        riskLevel = 'High';
      } else if (confidence >= 50) {
        riskLevel = 'Medium';
      } else {
        riskLevel = 'Low';
      }
  
      let riskMessage = '';
  
      if (riskLevel === 'High') {
        riskMessage =
          'The model detected this condition with high confidence.';
      } else if (riskLevel === 'Medium') {
        riskMessage =
          'The model detected this condition with moderate confidence.';
      } else {
        riskMessage =
          'The model detected this condition with lower confidence.';
      }
  
      // -----------------------------------------
      // Set result for existing UI
      // -----------------------------------------
  
      setResult({
        condition,
        confidence: Number(confidence.toFixed(1)),
        riskLevel,
        riskMessage,
        otherConditions,
      });
  
      setActiveTab('analysis');
  
    } catch (error: any) {
  
      console.error(
        'Disease detection error:',
        error
      );
  
      Alert.alert(
        'Analysis failed',
        error?.message ||
          'Could not connect to the disease detection server.'
      );
  
    } finally {
  
      setIsAnalysing(false);
  
    }
  };

  const selectHistoryImage = (item: UploadedImageEntry) => {
    setImageUri(item.uri);
    setResult(null);
  };

  // ----- Web drag & drop handlers -----
  const webDropHandlers =
    Platform.OS === 'web'
      ? ({
          onDragOver: (e: any) => {
            e.preventDefault();
            setIsDragging(true);
          },
          onDragLeave: (e: any) => {
            e.preventDefault();
            setIsDragging(false);
          },
          onDrop: (e: any) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              setImageUri(url);
              setResult(null);
            }
          },
        } as any)
      : {};

  const risk = result ? riskColors(result.riskLevel) : null;

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
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Image Diagnosis</Text>
          <Text style={styles.headerSubtitle}>
            Upload a plant image and get AI-powered analysis with recommended actions.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.mainRow, isWide && styles.mainRowWide]}>
          {/* LEFT: Upload + Analysis */}
          <View style={[styles.leftCol, isWide && styles.leftColWide]}>
            {/* Upload area */}
            <View
              ref={dropRef}
              style={[styles.uploadBox, isDragging && styles.uploadBoxDragging]}
              {...webDropHandlers}
            >
              {imageUri ? (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeBtn} onPress={removeImage}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={40} color={COLORS.accent} />
                  <Text style={styles.uploadTitle}>Upload Plant Image</Text>
                  <Text style={styles.uploadSubtitle}>PNG, JPG up to 10MB</Text>

                  <View style={styles.uploadButtonsRow}>
                    <TouchableOpacity style={styles.chooseFileBtn} onPress={pickFromLibrary}>
                      <Text style={styles.chooseFileText}>Choose File</Text>
                    </TouchableOpacity>

                    {Platform.OS !== 'web' && (
                      <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
                        <Ionicons name="camera-outline" size={16} color={COLORS.accent} />
                        <Text style={styles.cameraBtnText}>Take Photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {Platform.OS === 'web' && (
                    <Text style={styles.dragText}>or drag and drop here</Text>
                  )}
                </>
              )}
            </View>

            {/* Analyse button */}
            <TouchableOpacity
              style={[styles.analyseBtn, !imageUri && styles.analyseBtnDisabled]}
              onPress={analyseImage}
              disabled={!imageUri || isAnalysing}
            >
              {isAnalysing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#fff" />
                  <Text style={styles.analyseBtnText}>Analyse Image</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity onPress={() => setActiveTab('analysis')} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>
                  AI Analysis
                </Text>
                {activeTab === 'analysis' && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('actions')} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === 'actions' && styles.tabTextActive]}>
                  Recommended Actions
                </Text>
                {activeTab === 'actions' && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            </View>

            {/* Tab content */}
            {activeTab === 'analysis' ? (
              <View style={[styles.analysisRow, isWide && styles.analysisRowWide]}>
                {/* Possible Condition card */}
                <View style={[styles.card, styles.flexCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Ionicons name="leaf-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.cardHeaderText}>Possible Condition</Text>
                  </View>

                  {!result ? (
                    <Text style={styles.emptyText}>
                      {isAnalysing
                        ? 'Analysing your image...'
                        : 'Upload an image and tap Analyse Image to see results.'}
                    </Text>
                  ) : (
                    <>
                      <View style={styles.conditionBox}>
                        <View style={styles.conditionTopRow}>
                          <Text style={styles.conditionName}>{result.condition}</Text>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.confidenceValue}>{result.confidence}%</Text>
                            <Text style={styles.confidenceLabel}>Confidence</Text>
                          </View>
                        </View>
                        <View style={styles.progressTrack}>
                          <View
                            style={[styles.progressFill, { width: `${result.confidence}%` }]}
                          />
                        </View>
                      </View>

                      <Text style={styles.otherConditionsTitle}>Other Possible Conditions</Text>
                      {result.otherConditions.map((c) => (
                        <View key={c.name} style={styles.otherConditionRow}>
                          <View style={styles.otherConditionLeft}>
                            <Ionicons name="leaf-outline" size={14} color={COLORS.subtext} />
                            <Text style={styles.otherConditionName}>{c.name}</Text>
                          </View>
                          <Text style={styles.otherConditionValue}>{c.confidence}%</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {/* Risk Level card */}
                <View style={[styles.card, styles.riskCard]}>
                  <View style={styles.cardHeaderRow}>
                    <Ionicons name="shield-outline" size={16} color={COLORS.accent} />
                    <Text style={styles.cardHeaderText}>Detection Confidence</Text> 
                    {/* renamed from risk level to detection confidence */}
                  </View>

                  {!result ? (
                    <Text style={styles.emptyText}>No data yet.</Text>
                  ) : (
                    <View style={[styles.riskBadge, { backgroundColor: risk!.bg }]}>
                      <View style={styles.riskBadgeTop}>
                        <Ionicons name="warning-outline" size={16} color={risk!.text} />
                        <Text style={[styles.riskBadgeTitle, { color: risk!.text }]}>
                          {result.riskLevel}
                        </Text>
                      </View>
                      <Text style={styles.riskBadgeMessage}>{result.riskMessage}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="leaf-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.cardHeaderText}>Recommended Actions</Text>
                </View>

                {!result ? (
                  <Text style={styles.emptyText}>
                    Analyse an image first to see recommended actions.
                  </Text>
                ) : (
                  RECOMMENDED_ACTIONS.map((action) => (
                    <View key={action.title} style={styles.actionRow}>
                      <View style={styles.actionIconWrap}>
                        <Ionicons name={action.icon} size={16} color={COLORS.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{action.title}</Text>
                        <Text style={styles.actionDesc}>{action.description}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>

          {/* RIGHT: Uploaded Images history */}
          <View style={[styles.rightCol, isWide && styles.rightColWide]}>
            <View style={styles.card}>
              <View style={styles.historyHeaderRow}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="images-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.cardHeaderText}>Uploaded Images</Text>
                </View>
                {/* <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>All</Text>
                  <Ionicons name="chevron-down" size={12} color={COLORS.subtext} />
                </View> */}
              </View>

              {HISTORY.map((item) => {
                const r = riskColors(item.risk);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyRow}
                    onPress={() => selectHistoryImage(item)}
                  >
                    <Image source={{ uri: item.uri }} style={styles.historyThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyLabel}>{item.label}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                      <View style={[styles.riskPill, { backgroundColor: r.bg }]}>
                        <Text style={[styles.riskPillText, { color: r.text }]}>{item.risk}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.viewAllBtn}>
                <Ionicons name="folder-open-outline" size={16} color={COLORS.accent} />
                <Text style={styles.viewAllText}>View All Images</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      </View>
      </View>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
    body: { flex: 1, minHeight: 0, flexDirection: "row", overflow: "hidden", position: "relative" },
  root: { flex: 1, minHeight: 0, backgroundColor: C.page },
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
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 50,
    paddingBottom: 12,
  },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: COLORS.subtext, fontSize: 13, marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  mainRow: { flexDirection: 'column', gap: 16 },
  mainRowWide: { flexDirection: 'row', alignItems: 'flex-start' },

  leftCol: { width: '100%' },
  leftColWide: { flex: 2.2, marginRight: 16 },
  rightCol: { width: '100%' },
  rightColWide: { flex: 1 },

  uploadBox: {
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: COLORS.card,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxDragging: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  uploadTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginTop: 10 },
  uploadSubtitle: { color: COLORS.subtext, fontSize: 12, marginTop: 4, marginBottom: 16 },
  uploadButtonsRow: { flexDirection: 'row', gap: 10 },
  chooseFileBtn: {
    backgroundColor: COLORS.accentDark,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chooseFileText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cameraBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
  dragText: { color: COLORS.subtext, fontSize: 12, marginTop: 12 },

 previewWrap: {
  alignSelf: 'center',   // shrink to content, don't stretch full width
  position: 'relative',
},
previewImage: { width: 220, height: 220, borderRadius: 12 },
removeBtn: {
  position: 'absolute',
  top: -10,
  right: -10,            // fixed offset, not '32%'
  backgroundColor: COLORS.danger,
  width: 26,
  height: 26,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: COLORS.bg, // little ring so it pops off the image edge
},

  analyseBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.accentDark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  analyseBtnDisabled: { opacity: 0.5 },
  analyseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  tabRow: {
    flexDirection: 'row',
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tabItem: { marginRight: 24, paddingBottom: 10 },
  tabText: { color: COLORS.subtext, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: COLORS.accent, fontWeight: '700' },
  tabUnderline: {
    height: 2,
    backgroundColor: COLORS.accent,
    marginTop: 8,
    borderRadius: 2,
  },

  analysisRow: { flexDirection: 'column', gap: 12, marginTop: 16 },
  analysisRowWide: { flexDirection: 'row', alignItems: 'flex-start' },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 14,
    padding: 16,
  },
  flexCard: { flex: 1.4, marginRight: 0 },
  riskCard: { flex: 1, marginTop: 12 },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardHeaderText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  emptyText: { color: COLORS.subtext, fontSize: 13, lineHeight: 19 },

  conditionBox: {
    backgroundColor: COLORS.successDim,
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  conditionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  conditionName: { color: COLORS.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  confidenceValue: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  confidenceLabel: { color: COLORS.subtext, fontSize: 11 },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },

  otherConditionsTitle: { color: COLORS.subtext, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  otherConditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  otherConditionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  otherConditionName: { color: COLORS.text, fontSize: 13 },
  otherConditionValue: { color: COLORS.subtext, fontSize: 13, fontWeight: '600' },

  riskBadge: { borderRadius: 10, padding: 14 },
  riskBadgeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  riskBadgeTitle: { fontSize: 16, fontWeight: '700' },
  riskBadgeMessage: { color: COLORS.subtext, fontSize: 12, lineHeight: 18 },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  actionDesc: { color: COLORS.subtext, fontSize: 12, marginTop: 2, lineHeight: 17 },

  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillText: { color: COLORS.subtext, fontSize: 12 },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  historyThumb: { width: 44, height: 44, borderRadius: 8 },
  historyLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  historyDate: { color: COLORS.subtext, fontSize: 11, marginTop: 2 },
  riskPill: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  riskPillText: { fontSize: 10, fontWeight: '700' },

  viewAllBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
});