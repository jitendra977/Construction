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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
    return (
        <Tab.Navigator screenOptions={{
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
        }}>
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
                    title: 'Mero Ghar'
                }}
            />
            <Tab.Screen
                name="Resources"
                component={ResourcesScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
                    title: 'Resources'
                }}
            />
            <Tab.Screen
                name="Finance"
                component={FinanceScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Calculator color={color} size={size} />,
                    title: 'Finance'
                }}
            />
            <Tab.Screen
                name="Gallery"
                component={GalleryScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Image color={color} size={size} />,
                    title: 'Gallery'
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
                    title: 'Account'
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
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
