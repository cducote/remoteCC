import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ClaudeQuestionScreen({ question, rawText, options, onArrowUp, onArrowDown, onEnter }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when options change
  useEffect(() => {
    setSelectedIndex(0);
  }, [options]);

  const handleArrowUp = () => {
    if (options && options.length > 0) {
      setSelectedIndex(prev => (prev === 0 ? options.length - 1 : prev - 1));
    }
    onArrowUp();
  };

  const handleArrowDown = () => {
    if (options && options.length > 0) {
      setSelectedIndex(prev => (prev === options.length - 1 ? 0 : prev + 1));
    }
    onArrowDown();
  };

  // Extract context from rawText (everything before the question)
  const getContext = () => {
    if (!rawText || !question) return null;
    const questionIndex = rawText.indexOf(question);
    if (questionIndex <= 0) return null;
    const context = rawText.substring(0, questionIndex).trim();
    // Only show if there's meaningful content
    return context.length > 10 ? context : null;
  };

  const context = getContext();

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2d2d2d']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Claude Icon */}
        <Text style={styles.claudeIcon}>
          ▐▛███▜▌{'\n'}
          ▝▜█████▛▘{'\n'}
          ▘▘ ▝▝
        </Text>

        {/* Context (if available) */}
        {context && (
          <View style={styles.contextContainer}>
            <Text style={styles.contextText}>{context}</Text>
          </View>
        )}

        {/* Question */}
        {question && (
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        )}

        {/* Menu Options */}
        {options && options.length > 0 ? (
          <View style={styles.menuContainer}>
            {options.map((option, index) => (
              <View
                key={option.number}
                style={[
                  styles.menuItem,
                  selectedIndex === index && styles.menuItemSelected
                ]}
              >
                <Text style={styles.menuArrow}>
                  {selectedIndex === index ? '❯' : ' '}
                </Text>
                <Text style={styles.menuNumber}>{option.number}.</Text>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{option.title}</Text>
                  {option.description && (
                    <Text style={styles.menuDescription}>{option.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Fallback: Raw Terminal Output */
          <View style={styles.terminalContainer}>
            <Text style={styles.terminalText}>{rawText}</Text>
          </View>
        )}
      </ScrollView>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.arrowButton} onPress={handleArrowUp}>
          <Text style={styles.arrowButtonText}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.arrowButton} onPress={handleArrowDown}>
          <Text style={styles.arrowButtonText}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.enterButton} onPress={onEnter}>
          <Text style={styles.enterButtonText}>Enter</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 4,
    paddingTop: 8,
  },
  claudeIcon: {
    fontSize: 24,
    color: '#FF8C42',
    fontFamily: 'monospace',
    marginBottom: 8,
    lineHeight: 28,
    textAlign: 'center',
  },
  contextContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginBottom: 4,
  },
  contextText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
  },
  questionContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  questionText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#FF8C42',
    lineHeight: 16,
    fontWeight: 'bold',
  },
  menuContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 4,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  menuItemSelected: {
    backgroundColor: 'rgba(255, 140, 66, 0.1)',
  },
  menuArrow: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#FF8C42',
    width: 20,
    fontWeight: 'bold',
  },
  menuNumber: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ffffff',
    lineHeight: 16,
  },
  menuDescription: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
    lineHeight: 14,
    marginTop: 2,
    marginLeft: 16,
  },
  terminalContainer: {
    backgroundColor: '#000000',
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  terminalText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ffffff',
    lineHeight: 16,
  },
  controls: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    backgroundColor: '#000000',
  },
  arrowButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  arrowButtonText: {
    fontFamily: 'monospace',
    color: '#888',
    fontSize: 24,
    fontWeight: 'bold',
  },
  enterButton: {
    flex: 2,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  enterButtonText: {
    fontFamily: 'monospace',
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
