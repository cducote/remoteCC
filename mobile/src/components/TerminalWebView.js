import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

const terminalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background: #000000;
      overflow: hidden;
    }
    #terminal {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 8px;
    }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script>
    // Check if xterm loaded
    if (typeof Terminal === 'undefined') {
      document.body.innerHTML = '<div style="color: red; padding: 20px;">ERROR: xterm.js failed to load</div>';
      throw new Error('xterm.js not loaded');
    }

    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      },
      cols: 80,
      rows: 30,
      scrollback: 1000,
      convertEol: false
    });

    term.open(document.getElementById('terminal'));

    // Track scroll position
    let isAtBottom = true;

    // Make terminal fit container
    function fitTerminal() {
      const container = document.getElementById('terminal');
      const cols = Math.floor((container.clientWidth - 16) / 8);
      const rows = Math.floor((container.clientHeight - 16) / 17);
      if (cols > 0 && rows > 0) {
        term.resize(cols, rows);
      }
    }

    fitTerminal();
    window.addEventListener('resize', fitTerminal);

    // Monitor scroll position (xterm.js handles scrolling internally)
    term.onScroll(() => {
      const viewport = term.element.querySelector('.xterm-viewport');
      if (viewport) {
        const scrollTop = viewport.scrollTop;
        const scrollHeight = viewport.scrollHeight;
        const clientHeight = viewport.clientHeight;
        isAtBottom = (scrollHeight - scrollTop - clientHeight) < 50;

        // Notify React Native about scroll state
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'scroll',
            isAtBottom: isAtBottom
          }));
        }
      }
    });

    // Listen for output from React Native
    document.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          term.write(data.data);

          // Auto-scroll if already at bottom
          if (isAtBottom) {
            term.scrollToBottom();
          }
        } else if (data.type === 'clear') {
          term.clear();
        } else if (data.type === 'scrollToBottom') {
          term.scrollToBottom();
          isAtBottom = true;
        }
      } catch (e) {
        // Silently ignore parse errors
      }
    });

    // Also listen on window for compatibility
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          term.write(data.data);

          // Auto-scroll if already at bottom
          if (isAtBottom) {
            term.scrollToBottom();
          }
        } else if (data.type === 'clear') {
          term.clear();
        } else if (data.type === 'scrollToBottom') {
          term.scrollToBottom();
          isAtBottom = true;
        }
      } catch (e) {
        // Silently ignore parse errors
      }
    });

    // Disable keyboard input - we'll handle it via buttons
    term.attachCustomKeyEventHandler(() => false);
  </script>
</body>
</html>
`;

const TerminalWebView = forwardRef((props, ref) => {
  const webViewRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'scroll') {
        setShowScrollButton(!data.isAtBottom);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const scrollToBottom = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'scrollToBottom'
      }));
    }
    setShowScrollButton(false);
  };

  useImperativeHandle(ref, () => ({
    writeOutput: (data) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'output',
          data: data
        }));
      }
    },
    clearTerminal: () => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'clear'
        }));
      }
    },
    scrollToBottom: () => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'scrollToBottom'
        }));
      }
      setShowScrollButton(false);
    }
  }));

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: terminalHTML }}
        style={styles.webview}
        scrollEnabled={true}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onMessage={handleWebViewMessage}
      />
      {showScrollButton && (
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToBottom}>
          <Text style={styles.scrollButtonText}>↓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  }
});

export default TerminalWebView;
