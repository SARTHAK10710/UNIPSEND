import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import SpendingScreen from '../screens/SpendingScreen';
import InvestmentScreen from '../screens/InvestmentScreen';
import RewardsScreen from '../screens/RewardsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Spending: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Invest: { active: 'wallet', inactive: 'wallet-outline' },
  Rewards: { active: 'gift', inactive: 'gift-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarWrapper}>
      <BlurView blurType="dark" blurAmount={40} style={styles.blurContainer}>
        <View style={styles.tabBarInner}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const iconConfig = TAB_ICONS[route.name] || TAB_ICONS.Home;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <View key={route.key} style={styles.tabItem}>
                <View
                  style={[styles.tabButton, isFocused && styles.tabButtonActive]}
                  onTouchEnd={onPress}
                >
                  <Ionicons
                    name={isFocused ? iconConfig.active : iconConfig.inactive}
                    size={22}
                    color={isFocused ? '#7c6aff' : '#8884a8'}
                  />
                  {isFocused && <View style={styles.activeDot} />}
                </View>
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {route.name}
                </Text>
              </View>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Spending" component={SpendingScreen} />
      <Tab.Screen name="Invest" component={InvestmentScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  blurContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 17, 24, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 30,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 36,
    borderRadius: 18,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(124, 106, 255, 0.12)',
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7c6aff',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8884a8',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#7c6aff',
    fontWeight: '600',
  },
});

export default MainTabs;
