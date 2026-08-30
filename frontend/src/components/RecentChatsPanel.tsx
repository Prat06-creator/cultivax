import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type RecentChatItem = {
  id: string;
  title: string;
  preview: string;
  time: string;
  icon: keyof typeof Feather.glyphMap;
  active?: boolean;
};

type RecentChatsPanelProps = {
  chats: RecentChatItem[];
  activeChatId?: string;
  onSelectChat: (chat: RecentChatItem) => void;
  onNewChat: () => void;
};

// ----------------------------------------------------------------------------
// Sample data (mirrors the screenshot)
// ----------------------------------------------------------------------------

export const sampleRecentChats: RecentChatItem[] = [
  {
    id: '1',
    title: 'Tomato Leaf Disease',
    preview: 'What could be the reason for...',
    time: '10:30 AM',
    icon: 'feather',
    active: true,
  },
  {
    id: '2',
    title: 'Irrigation Advice',
    preview: 'How much water should I give...',
    time: '09:15 AM',
    icon: 'droplet',
  },
  {
    id: '3',
    title: 'Pest Detection',
    preview: 'Identify this pest in my crop...',
    time: 'Yesterday',
    icon: 'alert-circle',
  },
  {
    id: '4',
    title: 'Nutrient Deficiency',
    preview: 'Why are the leaves turning...',
    time: 'Yesterday',
    icon: 'circle',
  },
  {
    id: '5',
    title: 'Weather Forecast',
    preview: 'Will it rain in the next 3 days?',
    time: '2 Days Ago',
    icon: 'cloud-rain',
  },
  {
    id: '6',
    title: 'Soil Health',
    preview: 'How to improve soil organic...',
    time: '3 Days Ago',
    icon: 'layers',
  },
  {
    id: '7',
    title: 'Fertilizer Recommendation',
    preview: 'Best fertilizer for paddy crop...',
    time: '4 Days Ago',
    icon: 'package',
  },
  {
    id: '8',
    title: 'Weed Management',
    preview: 'How to control weeds...',
    time: '5 Days Ago',
    icon: 'wind',
  },
  {
    id: '9',
    title: 'Crop Rotation',
    preview: 'Which crop should I grow next...',
    time: '6 Days Ago',
    icon: 'refresh-cw',
  },
  {
    id: '10',
    title: 'General Query',
    preview: 'How to increase yield...',
    time: '1 Week Ago',
    icon: 'message-square',
  },
];

// ----------------------------------------------------------------------------
// Colors (match ChatAssistantScreen's palette)
// ----------------------------------------------------------------------------

const COLORS = {
  bg: '#0b1f1a',
  panel: '#0f2620',
  panelAlt: '#122b24',
  itemActive: '#14413a',
  border: '#1d3b32',
  accent: '#14b8a6',
  accentDark: '#0d9488',
  textPrimary: '#e8f3f0',
  textSecondary: '#9fb8b0',
  textMuted: '#6f8a82',
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default function RecentChatsPanel({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
}: RecentChatsPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = chats.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.preview.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Chats</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onNewChat}>
            <Feather name="edit-2" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="sliders" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Feather name="search" size={15} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Chat list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((chat) => {
          const isActive = chat.id === activeChatId;
          return (
            <TouchableOpacity
              key={chat.id}
              style={[styles.chatItem, isActive && styles.chatItemActive]}
              onPress={() => onSelectChat(chat)}
            >
              <View style={styles.chatIconWrap}>
                <Feather name={chat.icon} size={16} color={COLORS.accent} />
              </View>
              <View style={styles.chatTextWrap}>
                <View style={styles.chatTitleRow}>
                  <Text style={styles.chatTitle} numberOfLines={1}>
                    {chat.title}
                  </Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  {chat.preview}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* New chat button */}
      <TouchableOpacity style={styles.newChatBtn} onPress={onNewChat}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.newChatText}>New Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  headerIcons: { flexDirection: 'row', gap: 6 },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.panelAlt,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: COLORS.panelAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13, padding: 0 },

  list: { flex: 1, paddingHorizontal: 8 },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  chatItemActive: { backgroundColor: COLORS.itemActive },
  chatIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(20,184,166,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chatTextWrap: { flex: 1 },
  chatTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  chatTitle: { color: COLORS.textPrimary, fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  chatTime: { color: COLORS.textMuted, fontSize: 10.5 },
  chatPreview: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 12,
    backgroundColor: COLORS.accentDark,
    borderRadius: 10,
    paddingVertical: 12,
  },
  newChatText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
