import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import websocket from '../services/websocket';

export default function TerminalScreen({ route, navigation }) {
  const { url } = route.params;
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const scrollViewRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const outputBufferRef = useRef('');
  const bufferTimerRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    websocket.connect(url);

    // Set up event listeners
    websocket.on('connected', handleConnected);
    websocket.on('output', handleOutput);
    websocket.on('error', handleError);
    websocket.on('exit', handleExit);
    websocket.on('disconnect', handleServerDisconnect);
    websocket.on('maxRetriesReached', handleMaxRetriesReached);

    // Cleanup on unmount
    return () => {
      // Clear buffer timer
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }

      websocket.off('connected', handleConnected);
      websocket.off('output', handleOutput);
      websocket.off('error', handleError);
      websocket.off('exit', handleExit);
      websocket.off('disconnect', handleServerDisconnect);
      websocket.off('maxRetriesReached', handleMaxRetriesReached);
      websocket.disconnect();
    };
  }, [url]);

  useEffect(() => {
    if (autoScroll && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: false });
    }
  }, [output, autoScroll]);

  const handleConnected = (data) => {
    setConnectionStatus('connected');
    addOutput(`\n✅ ${data.message}\n`, 'system');
  };

  const handleOutput = (data) => {
    // Accumulate output in buffer
    outputBufferRef.current += data.data;

    // Clear existing timer
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
    }

    // Set new timer to flush buffer after 500ms of no new output
    bufferTimerRef.current = setTimeout(() => {
      if (outputBufferRef.current) {
        addOutput(outputBufferRef.current, 'output');
        outputBufferRef.current = '';
      }
    }, 500);
  };

  const handleError = (data) => {
    setConnectionStatus('error');
    addOutput(`\n❌ Error: ${data.message}\n`, 'error');
  };

  const handleExit = (data) => {
    addOutput(`\n💀 Process exited (code: ${data.exitCode})\n`, 'system');
  };

  const handleServerDisconnect = (data) => {
    setConnectionStatus('disconnected');
    addOutput(`\n🔌 Disconnected from server\n`, 'system');
  };

  const handleMaxRetriesReached = (data) => {
    Alert.alert(
      'Connection Lost',
      'Failed to reconnect to server after 5 attempts.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const addOutput = (text, type = 'output') => {
    setOutput(prev => {
      const now = Date.now();
      const newOutput = [...prev, { text, type, id: now, timestamp: now }];

      // Keep only last 50 items to prevent clutter and focus on current context
      if (newOutput.length > 50) {
        return newOutput.slice(-50);
      }
      return newOutput;
    });
  };

  const sendInput = () => {
    if (input.trim()) {
      websocket.sendInput(input + '\r');
      setInput('');
    }
  };

  const sendQuickAction = (text) => {
    websocket.sendInput(text);
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    setAutoScroll(isAtBottom);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FFC107';
      case 'disconnected': return '#F44336';
      case 'error': return '#F44336';
      default: return '#999';
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            websocket.disconnect();
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{connectionStatus}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setOutput([])} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Terminal Output */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.terminalScroll}
        contentContainerStyle={styles.terminalContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {output.map((item) => (
          <Text
            key={item.id}
            style={[
              styles.terminalText,
              item.type === 'system' && styles.systemText,
              item.type === 'error' && styles.errorText,
            ]}
          >
            {item.text}
          </Text>
        ))}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('\x1b[A')}
          >
            <Text style={styles.quickButtonText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('\x1b[B')}
          >
            <Text style={styles.quickButtonText}>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('\r')}
          >
            <Text style={styles.quickButtonText}>Enter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('y\r')}
          >
            <Text style={styles.quickButtonText}>y</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('n\r')}
          >
            <Text style={styles.quickButtonText}>n</Text>
          </TouchableOpacity>
        </View>
        {/* More Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('\t')}
          >
            <Text style={styles.quickButtonText}>Tab</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('\x03')}
          >
            <Text style={styles.quickButtonText}>Ctrl+C</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendQuickAction('\x04')}
          >
            <Text style={styles.quickButtonText}>Ctrl+D</Text>
          </TouchableOpacity>
        </View>

        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type command..."
            placeholderTextColor="#666"
            onSubmitEditing={sendInput}
            returnKeyType="send"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendInput}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  clearButtonText: {
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  disconnectButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  terminalScroll: {
    flex: 1,
  },
  terminalContent: {
    padding: 12,
  },
  terminalText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
  },
  systemText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#F44336',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
