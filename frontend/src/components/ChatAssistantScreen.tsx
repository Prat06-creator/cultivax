import React, { useRef, useState } from 'react';
import {useRouter} from 'expo-router'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator, useWindowDimensions
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Sidebar from '@/components/sidebar';
import RecentChatsPanel, { sampleRecentChats, RecentChatItem } from '@/components/RecentChatsPanel';
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
// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type Attachment = {
  uri: string;
  name: string;
  kind: 'image' | 'file';
};

type DiagnosisContent = {
  intro: string;
  causesTitle: string;
  causes: string[];
  recommendationsTitle: string;
  recommendations: string[];
};

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  time: string;
  text?: string;
  attachments?: Attachment[];
  diagnosis?: DiagnosisContent;
  feedback?: 'up' | 'down' | null;
};

// ----------------------------------------------------------------------------
// Seed data (mirrors the screenshot conversation)
// ----------------------------------------------------------------------------

const initialMessages: Message[] = [
  {
    id: 'm1',
    sender: 'user',
    time: '10:30 AM',
    text: 'What could be the reason for holes in the leaves and yellow patches in my tomato plants?',
    attachments: [
      {
        uri: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600',
        name: 'leaf-1.jpg',
        kind: 'image',
      },
      {
        uri: 'https://images.unsplash.com/photo-1615671524827-c1fe3973b648?w=600',
        name: 'leaf-2.jpg',
        kind: 'image',
      },
    ],
  },
  {
    id: 'm2',
    sender: 'assistant',
    time: '10:31 AM',
    diagnosis: {
      intro:
        'Based on the images, your tomato plant shows signs of pest infestation, likely caused by leaf-eating caterpillars or beetles.',
      causesTitle: 'Possible Causes:',
      causes: [
        'Leaf-eating insects are chewing on the leaves.',
        'Irregular holes and yellow patches are common symptoms.',
        'High pest activity due to warm and humid conditions.',
      ],
      recommendationsTitle: 'Recommendations:',
      recommendations: [
        'Remove affected leaves and destroy them.',
        'Spray Neem oil (3-5 ml/liter of water) or use a biological pesticide.',
        'Monitor regularly and set up yellow sticky traps.',
        'Maintain proper field hygiene.',
      ],
    },
    feedback: null,
  },
];

// ----------------------------------------------------------------------------
// Colors
// ----------------------------------------------------------------------------
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
  bg: '#0b1f1a',
  panel: '#0f2620',
  panelAlt: '#122b24',
  bubbleUser: '#14413a',
  bubbleAssistant: '#122b25',
  border: '#1d3b32',
  accent: '#14b8a6',
  accentDark: '#0d9488',
  textPrimary: '#e8f3f0',
  textSecondary: '#9fb8b0',
  textMuted: '#6f8a82',
  online: '#22c55e',
};
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
// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default function ChatAssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
 const isNarrow = screenWidth < 900;
  const [toast, setToast] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<(typeof NAV_ITEMS)[number]["key"]>("chats");
  const [sidebarOpen, setSidebarOpen] = useState(!isNarrow);
  const [chatsPanelOpen, setChatsPanelOpen] = useState(!isNarrow);

// inside your component, add:
const [activeChatId, setActiveChatId] = useState('1');
  const formatTime = () => {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  // ---- Image picker -----------------------------------------------------
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos to attach images.');
        return;
      }
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const picked: Attachment[] = result.assets.map((asset, idx) => ({
          uri: asset.uri,
          name: asset.fileName ?? `image-${Date.now()}-${idx}.jpg`,
          kind: 'image',
        }));
        setPendingAttachments((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open the photo library.');
    } finally {
      setUploading(false);
    }
  };

  // ---- Document / file picker --------------------------------------------
  const handlePickDocument = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const picked: Attachment[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          kind: 'file',
        }));
        setPendingAttachments((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open the file picker.');
    } finally {
      setUploading(false);
    }
  };

  // ---- Mic placeholder ----------------------------------------------------
  const handleMicPress = () => {
    Alert.alert('Voice input', 'Voice input is not wired up yet — hook this into your speech-to-text service.');
  };

  const removePendingAttachment = (uri: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.uri !== uri));
  };

  // ---- Send ----------------------------------------------------------------
  const handleSend = () => {
    if (!input.trim() && pendingAttachments.length === 0) return;

    const newMessage: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      time: formatTime(),
      text: input.trim() || undefined,
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setPendingAttachments([]);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Placeholder assistant reply — wire this to your backend / AI call.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          time: formatTime(),
          text: "Thanks for sharing that. Let me take a look and get back to you with recommendations.",
          feedback: null,
        },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, 600);
  };

  const handleFeedback = (id: string, value: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === value ? null : value } : m))
    );
  };
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }
  const handleSelectChat = (chat: RecentChatItem) => {
    setActiveChatId(chat.id);
    if (isNarrow) setChatsPanelOpen(false);
    // TODO: load this chat's real messages once you have a backend
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId('');
    if (isNarrow) setChatsPanelOpen(false);
  };
   const Wrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const wrapperProps =
    Platform.OS === 'web'
      ? {}
      : {
          behavior: Platform.OS === 'ios' ? 'padding' : undefined,
          keyboardVerticalOffset: Platform.OS === 'ios' ? 60 : 0,
        };
  return (
    // <KeyboardAvoidingView
    //   style={styles.flex}
    //   behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    //   keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    // >
       <Wrapper style={styles.flex} {...wrapperProps}>
      <View style={styles.container}>
        <View style={[styles.body ]}>
                <Sidebar
                activeNav={activeNav}
          setActiveNav={setActiveNav}
          isNarrow={isNarrow}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          showToast={showToast}/>
        {/* Header */}
        {/* <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.leafBadge}>
              <Feather name="feather" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.headerTitle}>CultivaX AI Assistant</Text>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          <TouchableOpacity style={styles.avatarWrap}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View> */}
                {isNarrow && chatsPanelOpen && (
          <TouchableOpacity
            style={styles.chatsBackdrop}
            activeOpacity={1}
            onPress={() => setChatsPanelOpen(false)}
          />
        )}
        {(!isNarrow || chatsPanelOpen) && (
          <View style={[styles.chatsPanelWrap, isNarrow && styles.chatsPanelWrapNarrow]}>
            <RecentChatsPanel
              chats={sampleRecentChats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
            />
          </View>
        )}
        <View style={styles.mainChat}>
                  {isNarrow && (
          <View style={[styles.chatsToggleBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setChatsPanelOpen((o) => !o)} style={styles.chatsToggleBtn}>
              <Feather name="clock" size={16} color={COLORS.textPrimary} />
              <Text style={styles.chatsToggleText}>Recent Chats</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <Text style={styles.dayLabel}>Today</Text>

          {messages.map((msg) =>
            msg.sender === 'user' ? (
              <UserBubble key={msg.id} message={msg} />
            ) : (
              <AssistantBubble
                key={msg.id}
                message={msg}
                onFeedback={(v) => handleFeedback(msg.id, v)}
              />
            )
          )}
        </ScrollView>

        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pendingRow}
            contentContainerStyle={{ gap: 8 }}
          >
            {pendingAttachments.map((att) => (
              <View key={att.uri} style={styles.pendingItem}>
                {att.kind === 'image' ? (
                  <Image source={{ uri: att.uri }} style={styles.pendingThumb} />
                ) : (
                  <View style={styles.pendingFileThumb}>
                    <Feather name="file-text" size={20} color={COLORS.textSecondary} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => removePendingAttachment(att.uri)}
                >
                  <Feather name="x" size={12} color="#fff" />
                </TouchableOpacity>
                <Text numberOfLines={1} style={styles.pendingName}>
                  {att.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask anything about your farm, crops, pests, diseases..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <View style={styles.inputActions}>
            <View style={styles.inputActionsLeft}>
              <TouchableOpacity style={styles.iconBtn} onPress={handlePickImage} disabled={uploading}>
                <Feather name="image" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handlePickDocument} disabled={uploading}>
                <Feather name="file" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleMicPress}>
                <Feather name="mic" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {uploading && <ActivityIndicator size="small" color={COLORS.accent} />}
            </View>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !(input.trim() || pendingAttachments.length) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!(input.trim() || pendingAttachments.length)}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          CultivaX AI Assistant can make mistakes. Please verify important information.
        </Text>
        </View>
      </View>
      </View>
      </Wrapper>
   
  );
}

// ----------------------------------------------------------------------------
// Sub components
// ----------------------------------------------------------------------------

function UserBubble({ message }: { message: Message }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        {message.text ? <Text style={styles.userText}>{message.text}</Text> : null}
        <View style={styles.userTimeRow}>
          <Text style={styles.timeText}>{message.time}</Text>
          <Ionicons name="checkmark-done" size={14} color={COLORS.accent} style={{ marginLeft: 4 }} />
        </View>
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachmentGrid}>
            {message.attachments.map((att, idx) =>
              att.kind === 'image' ? (
                <Image key={idx} source={{ uri: att.uri }} style={styles.attachmentImage} />
              ) : (
                <View key={idx} style={styles.attachmentFile}>
                  <Feather name="file-text" size={16} color={COLORS.textSecondary} />
                  <Text numberOfLines={1} style={styles.attachmentFileName}>
                    {att.name}
                  </Text>
                </View>
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function AssistantBubble({
  message,
  onFeedback,
}: {
  message: Message;
  onFeedback: (v: 'up' | 'down') => void;
}) {
  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantAvatar}>
        <Feather name="feather" size={14} color={COLORS.accent} />
      </View>
      <View style={styles.assistantBubble}>
        {message.diagnosis ? (
          <>
            <Text style={styles.assistantText}>{message.diagnosis.intro}</Text>

            <Text style={styles.sectionTitle}>{message.diagnosis.causesTitle}</Text>
            {message.diagnosis.causes.map((c, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{c}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>{message.diagnosis.recommendationsTitle}</Text>
            {message.diagnosis.recommendations.map((r, i) => (
              <View key={i} style={styles.numberRow}>
                <Text style={styles.numberIndex}>{i + 1}.</Text>
                <Text style={styles.bulletText}>{r}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Was this helpful?</Text>
              <View style={styles.feedbackIcons}>
                <TouchableOpacity onPress={() => onFeedback('up')} style={styles.feedbackIconBtn}>
                  <Feather
                    name="thumbs-up"
                    size={16}
                    color={message.feedback === 'up' ? COLORS.accent : COLORS.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onFeedback('down')} style={styles.feedbackIconBtn}>
                  <Feather
                    name="thumbs-down"
                    size={16}
                    color={message.feedback === 'down' ? '#ef4444' : COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeText}>{message.time}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.assistantText}>{message.text}</Text>
            <Text style={[styles.timeText, { marginTop: 6 }]}>{message.time}</Text>
          </>
        )}
      </View>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
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
  flex: { flex: 1,width: '100%', height: '100%' },
  container: { flex: 1, width: '100%', backgroundColor: COLORS.bg },
mainChat: { flex: 1, minHeight: 0, flexDirection: 'column' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.panel,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leafBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(20,184,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.online,
    marginLeft: 6,
  },
  onlineText: { color: COLORS.textSecondary, fontSize: 12 },
  avatarWrap: {},
  avatar: { width: 32, height: 32, borderRadius: 16 },

  messages: { flex: 1 },
  messagesContent: { padding: 14, paddingBottom: 20 },
  dayLabel: {
    alignSelf: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },

  // User bubble
  userRow: { alignItems: 'flex-end', marginBottom: 16 },
  userBubble: {
    backgroundColor: COLORS.bubbleUser,
    borderRadius: 14,
    borderTopRightRadius: 4,
    padding: 12,
    maxWidth: '90%',
  },
  userText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  userTimeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  timeText: { color: COLORS.textMuted, fontSize: 11 },
  attachmentGrid: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  attachmentImage: { width: 130, height: 130, borderRadius: 10, backgroundColor: COLORS.panelAlt },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.panelAlt,
    borderRadius: 10,
    padding: 10,
    width: 150,
  },
  attachmentFileName: { color: COLORS.textSecondary, fontSize: 11, flexShrink: 1 },

  // Assistant bubble
  assistantRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  assistantBubble: {
    backgroundColor: COLORS.bubbleAssistant,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 14,
    flex: 1,
  },
  assistantText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: COLORS.accent, fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 4 },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 7,
    marginRight: 8,
  },
  bulletText: { color: COLORS.textPrimary, fontSize: 13.5, lineHeight: 19, flex: 1 },
  numberRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: 4 },
  numberIndex: { color: COLORS.accent, fontSize: 13.5, marginRight: 8, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginTop: 10, marginBottom: 10 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center' },
  feedbackLabel: { color: COLORS.textSecondary, fontSize: 12, marginRight: 10 },
  feedbackIcons: { flexDirection: 'row', gap: 12, flex: 1 },
  feedbackIconBtn: { padding: 2 },

  // Pending attachments preview (above input)
  pendingRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.panel,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pendingItem: { width: 64, alignItems: 'center' },
  pendingThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.panelAlt },
  pendingFileThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLORS.panelAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -4,
    right: 2,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingName: { color: COLORS.textMuted, fontSize: 9, marginTop: 3, maxWidth: 60 },

  // Input bar
  inputBar: {
    backgroundColor: COLORS.panel,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
  },
  textInput: {
  color: COLORS.textPrimary,
  fontSize: 14,
  maxHeight: 90,
  minHeight: 40,
  paddingHorizontal: 16,
  paddingVertical: 10,
  backgroundColor: COLORS.panelAlt,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: COLORS.border,
},
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  inputActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1c3d36' },

  disclaimer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.bg,
  },
    chatsPanelWrap: { width: 300, flexShrink: 0 },
  chatsPanelWrapNarrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    zIndex: 45,
  },
  chatsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 44,
  },
  chatsToggleBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chatsToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatsToggleText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
});
