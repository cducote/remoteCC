import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import websocket from '../services/websocket';
import ClaudeLoadingScreen from '../components/ClaudeLoadingScreen';
import ClaudeQuestionScreen from '../components/ClaudeQuestionScreen';

export default function TerminalScreen({ route, navigation }) {
  const { url } = route.params;
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [claudeState, setClaudeState] = useState('working'); // 'waiting' or 'working'
  const [questionData, setQuestionData] = useState(null); // Parsed question and options

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
    websocket.on('state', handleStateChange);

    // Cleanup on unmount
    return () => {
      websocket.off('connected', handleConnected);
      websocket.off('output', handleOutput);
      websocket.off('error', handleError);
      websocket.off('exit', handleExit);
      websocket.off('disconnect', handleServerDisconnect);
      websocket.off('maxRetriesReached', handleMaxRetriesReached);
      websocket.off('state', handleStateChange);
      websocket.disconnect();
    };
  }, [url]);

  const handleConnected = (data) => {
    setConnectionStatus('connected');
  };

  const handleOutput = (data) => {
    // Output is ignored - we only show parsed questions
  };

  const handleError = (data) => {
    setConnectionStatus('error');
    Alert.alert('Error', data.message);
  };

  const handleExit = (data) => {
    Alert.alert('Process Exited', `Claude Code exited with code ${data.exitCode}`);
  };

  const handleServerDisconnect = (data) => {
    setConnectionStatus('disconnected');
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

  const handleStateChange = (data) => {
    setClaudeState(data.state);

    // If waiting state, extract question data
    if (data.state === 'waiting') {
      setQuestionData({
        question: data.question,
        options: data.options,
        rawText: data.rawText
      });
    } else {
      setQuestionData(null);
    }
  };

  const handleArrowUp = () => {
    websocket.sendInput('\x1b[A'); // Up arrow
  };

  const handleArrowDown = () => {
    websocket.sendInput('\x1b[B'); // Down arrow
  };

  const handleEnter = () => {
    websocket.sendInput('\r'); // Enter key
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
        <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Content - show loading when working, question screen when waiting */}
      {claudeState === 'working' ? (
        <ClaudeLoadingScreen />
      ) : (
        <ClaudeQuestionScreen
          question={questionData?.question}
          rawText={questionData?.rawText || 'Waiting for Claude...'}
          options={questionData?.options}
          onArrowUp={handleArrowUp}
          onArrowDown={handleArrowDown}
          onEnter={handleEnter}
        />
      )}
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
});
