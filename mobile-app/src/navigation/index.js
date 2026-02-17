import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, User, Package, Calculator, Image } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ResourcesScreen from '../screens/ResourcesScreen';
import FinanceScreen from '../screens/FinanceScreen';
import GalleryScreen from '../screens/GalleryScreen';
import PhaseDetailScreen from '../screens/PhaseDetailScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import PhaseFormScreen from '../screens/PhaseFormScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import ContractorsScreen from '../screens/ContractorsScreen';
import PermitsScreen from '../screens/PermitsScreen';
import EstimatorScreen from '../screens/EstimatorScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#9ca3af',
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    height: 90, // Increased height for safe area
                    paddingBottom: 34, // Standard iOS home indicator height
                    paddingTop: 10,
                    backgroundColor: 'white',
                    position: 'absolute',
                    bottom: 0, // Ensure it sticks to bottom
                    left: 0,
                    right: 0,
                },
                // Performance optimizations
                // Performance optimizations
                lazy: false, // Preload tabs for smoother switching
                detachInactiveScreens: false, // Keep screens attached for instant touch response
                unmountOnBlur: false, // Keep visited tabs in memory
                freezeOnBlur: false, // Reverted to false to prevent hanging issues
            }}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
                    title: 'Home',
                    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }
                }}
            />
            <Tab.Screen
                name="Resources"
                component={ResourcesScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
                    title: 'Resources',
                    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }
                }}
            />
            <Tab.Screen
                name="Finance"
                component={FinanceScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Calculator color={color} size={size} />,
                    title: 'Finance',
                    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }
                }}
            />
            <Tab.Screen
                name="Gallery"
                component={GalleryScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Image color={color} size={size} />,
                    title: 'Gallery',
                    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
                    title: 'Account',
                    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' }
                }}
            />
        </Tab.Navigator>
    );
}

export default function Navigation() {
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={DashboardTabs} />
                        <Stack.Screen
                            name="PhaseDetail"
                            component={PhaseDetailScreen}
                            options={{ headerShown: true, title: 'Phase Details' }}
                        />
                        <Stack.Screen
                            name="TaskDetail"
                            component={TaskDetailScreen}
                            options={{ headerShown: true, title: 'Task Details' }}
                        />
                        <Stack.Screen
                            name="PhaseForm"
                            component={PhaseFormScreen}
                            options={{ headerShown: true }}
                        />
                        <Stack.Screen
                            name="Suppliers"
                            component={SuppliersScreen}
                            options={{ headerShown: true, title: 'Suppliers' }}
                        />
                        <Stack.Screen
                            name="Contractors"
                            component={ContractorsScreen}
                            options={{ headerShown: true, title: 'Contractors' }}
                        />
                        <Stack.Screen
                            name="Permits"
                            component={PermitsScreen}
                            options={{ headerShown: true, title: 'Permits' }}
                        />
                        <Stack.Screen
                            name="Estimator"
                            component={EstimatorScreen}
                            options={{ headerShown: true, title: 'Estimator' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
