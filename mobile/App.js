import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import QRScannerScreen from './src/screens/QRScannerScreen';
import TerminalScreen from './src/screens/TerminalScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#000',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              title: 'RemoteCC',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Terminal"
            component={TerminalScreen}
            options={{
              title: 'Terminal',
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
