import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useCopilot } from '../hooks/useCopilot';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarEmoji}>🤖</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {formatBoldText(message.text)}
        </Text>
        <Text style={styles.bubbleTime}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {isUser && (
        <View style={styles.avatarSmallUser}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
      )}
    </View>
  );
};

// Simple bold text renderer: **text** → bold
const formatBoldText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '800', color: '#f0efff' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
};

// ─────────────────────────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <View style={[styles.bubbleRow]}>
    <View style={styles.avatarSmall}>
      <Text style={styles.avatarEmoji}>🤖</Text>
    </View>
    <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, { animationDelay: '0ms' }]} />
        <View style={[styles.dot, { animationDelay: '200ms' }]} />
        <View style={[styles.dot, { animationDelay: '400ms' }]} />
      </View>
      <Text style={styles.typingText}>Analyzing...</Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────
// Quick Action Chip
// ─────────────────────────────────────────────────────────────

const QuickActionChip = ({ label, onPress }) => (
  <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.chipText}>{label}</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────

const CopilotScreen = () => {
  const {
    messages,
    inputText,
    setInputText,
    isTyping,
    sendMessage,
    quickActions,
    aiLoading,
    aiAvailable,
  } = useCopilot();

  const scrollViewRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
    }
  };

  const handleQuickAction = (query) => {
    sendMessage(query);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient
        colors={['#0f0f18', '#0a0a0f']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>🤖</Text>
            <View style={[styles.statusDot, { backgroundColor: aiAvailable ? '#4effd6' : '#ff6b6b' }]} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Unispend Co-pilot</Text>
            <Text style={styles.headerStatus}>
              {aiLoading ? 'Syncing data...' : aiAvailable ? 'Online • Analyzing your finances' : 'Connecting...'}
            </Text>
          </View>
          {aiLoading && <ActivityIndicator size="small" color="#7c6aff" />}
        </View>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        {/* Quick Actions — show after greeting or when few messages */}
        {messages.length <= 2 && !isTyping && (
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsLabel}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, idx) => (
                <QuickActionChip
                  key={idx}
                  label={action.label}
                  onPress={() => handleQuickAction(action.query)}
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        {/* Inline quick actions when chat is active */}
        {messages.length > 2 && (
          <FlatList
            data={quickActions}
            renderItem={({ item }) => (
              <QuickActionChip
                label={item.label}
                onPress={() => handleQuickAction(item.query)}
              />
            )}
            keyExtractor={(_, idx) => `qa-${idx}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineQuickActions}
          />
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask about your finances..."
              placeholderTextColor="#4a4660"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline={false}
              editable={!isTyping}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={inputText.trim() && !isTyping ? ['#7c6aff', '#9b8aff'] : ['#2a2a3a', '#2a2a3a']}
              style={styles.sendGradient}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },

  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124, 106, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  headerAvatarText: {
    fontSize: 22,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#f0efff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerStatus: {
    color: '#4effd6',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Bubble
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(124, 106, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  avatarSmallUser: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(78, 255, 214, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: width * 0.72,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleAssistant: {
    backgroundColor: '#17171f',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.1)',
  },
  bubbleUser: {
    backgroundColor: '#7c6aff',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: '#d4d0f0',
    fontSize: 14,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#ffffff',
  },
  bubbleTime: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },

  // Typing
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7c6aff',
    opacity: 0.6,
  },
  typingText: {
    color: '#8884a8',
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 4,
  },

  // Quick Actions
  quickActionsSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  quickActionsLabel: {
    color: '#8884a8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(124, 106, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 255, 0.2)',
  },
  chipText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '600',
  },
  inlineQuickActions: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    gap: 8,
  },

  // Input
  inputContainer: {
    backgroundColor: '#0f0f18',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#17171f',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 18,
    minHeight: 48,
    justifyContent: 'center',
  },
  textInput: {
    color: '#f0efff',
    fontSize: 15,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default CopilotScreen;
