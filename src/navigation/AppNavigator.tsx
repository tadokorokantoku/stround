import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import TrackDetailScreen from '../screens/track/TrackDetailScreen';
import { UserTrack } from '../types';

export type RootStackParamList = {
  Main: undefined;
  TrackDetail: { userTrack: UserTrack };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator initialRouteName="Main">
          <Stack.Screen 
            name="Main" 
            component={MainNavigator} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="TrackDetail" 
            component={TrackDetailScreen}
            options={{
              title: '楽曲詳細',
              headerBackTitleVisible: false,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});