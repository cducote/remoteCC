import React from 'react';
import { Text } from 'react-native';

// ANSI color codes to RGB colors
const ANSI_COLORS = {
  // Standard colors
  30: '#000000', // black
  31: '#FF0000', // red
  32: '#00FF00', // green
  33: '#FFFF00', // yellow
  34: '#0000FF', // blue
  35: '#FF00FF', // magenta
  36: '#00FFFF', // cyan
  37: '#FFFFFF', // white

  // Bright colors
  90: '#808080', // bright black (gray)
  91: '#FF8080', // bright red
  92: '#80FF80', // bright green
  93: '#FFFF80', // bright yellow
  94: '#8080FF', // bright blue
  95: '#FF80FF', // bright magenta
  96: '#80FFFF', // bright cyan
  97: '#FFFFFF', // bright white

  // 256 color - orange (used by Claude)
  '38;2;255;165;0': '#FFA500', // orange
  '38;2;215;119;87': '#D77757', // another orange shade
};

export function parseAnsiText(text) {
  // Remove cursor movement and other non-color ANSI codes
  let cleaned = text
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '') // CSI sequences
    .replace(/\x1b\[[0-9]*[A-DFHJKST]/g, '') // Cursor movements
    .replace(/\x1b\[=[0-9]*[a-zA-Z]/g, '') // Other CSI
    .replace(/\x1b\[[0-9]*[GHIJK]/g, ''); // More movements

  const parts = [];
  let currentColor = '#FFFFFF';
  let buffer = '';
  let i = 0;

  while (i < cleaned.length) {
    if (cleaned[i] === '\x1b' && cleaned[i + 1] === '[') {
      // Save current buffer
      if (buffer) {
        parts.push({ text: buffer, color: currentColor });
        buffer = '';
      }

      // Find the end of the ANSI code
      let j = i + 2;
      while (j < cleaned.length && cleaned[j] !== 'm') {
        j++;
      }

      if (j < cleaned.length) {
        const code = cleaned.substring(i + 2, j);

        // Check for 256 color mode (38;2;R;G;B)
        if (code.startsWith('38;2;')) {
          currentColor = ANSI_COLORS[code] || currentColor;
        } else if (code === '0') {
          // Reset
          currentColor = '#FFFFFF';
        } else {
          // Standard color
          const colorCode = parseInt(code);
          currentColor = ANSI_COLORS[colorCode] || currentColor;
        }

        i = j + 1;
      } else {
        buffer += cleaned[i];
        i++;
      }
    } else {
      buffer += cleaned[i];
      i++;
    }
  }

  if (buffer) {
    parts.push({ text: buffer, color: currentColor });
  }

  return parts;
}

export default function AnsiText({ children, style }) {
  const parts = parseAnsiText(children || '');

  return (
    <Text style={style}>
      {parts.map((part, index) => (
        <Text key={index} style={{ color: part.color }}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
}
