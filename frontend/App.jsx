import React from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';

import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import ConnectBankScreen from './src/screens/ConnectBankScreen';
import MainTabs from './src/navigation/MainTabs';

const Stack = createNativeStackNavigator();

const darkTheme = {
  dark: true,
  colors: {
    primary: '#7c6aff',
    background: '#0a0a0f',
    card: '#17171f',
    text: '#f0efff',
    border: 'rgba(255,255,255,0.06)',
    notification: '#ff6b6b',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoText}>U</Text>
        </View>
        <ActivityIndicator size="large" color="#7c6aff" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0f' },
        animation: 'slide_from_right',
      }}
    >
      {user ? (
        // Logged in → straight to Main (ConnectBank accessible from Main if needed)
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        // Not logged in → Splash → Auth → ConnectBank → Main
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="ConnectBank" component={ConnectBankScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" translucent={false} />
      <AuthProvider>
        <NavigationContainer theme={darkTheme}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#7c6aff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c6aff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingLogoText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
});
