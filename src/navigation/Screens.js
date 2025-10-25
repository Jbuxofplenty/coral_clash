import { Dimensions, Alert, useWindowDimensions } from 'react-native';
import { Icon, Header } from '../components';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import GameScreen from '../screens/Game';
import HomeScreen from '../screens/Home';
import Login from '../screens/Login';
import Settings from '../screens/Settings';
import Friends from '../screens/Friends';
import Stats from '../screens/Stats';
import HowToPlay from '../screens/HowToPlay';
import ScenarioBoard from '../screens/ScenarioBoard';
import CustomDrawerContent from './Menu';
import { useAuth, useTheme, useAlert } from '../contexts';

const { width } = Dimensions.get('screen');

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function HomeStack(props) {
    return (
        <Stack.Navigator initialRouteName='Dashboard'>
            <Stack.Screen
                name='Dashboard'
                component={HomeScreen}
                options={{
                    header: ({ navigation, scene }) => (
                        <Header title='Home' navigation={navigation} scene={scene} />
                    ),
                }}
            />
            <Stack.Screen
                name='Game'
                component={GameScreen}
                options={{
                    header: ({ navigation, scene }) => (
                        <Header title='Game' navigation={navigation} scene={scene} back />
                    ),
                }}
            />
            <Stack.Screen
                name='ScenarioBoard'
                component={ScenarioBoard}
                options={{
                    header: ({ navigation, scene }) => (
                        <Header title='Tutorial' navigation={navigation} scene={scene} back />
                    ),
                }}
            />
        </Stack.Navigator>
    );
}

function HowToPlayStack(props) {
    return (
        <Stack.Navigator initialRouteName='HowToPlayMain'>
            <Stack.Screen
                name='HowToPlayMain'
                component={HowToPlay}
                options={{
                    header: ({ navigation, scene }) => (
                        <Header title='How-To Play' navigation={navigation} scene={scene} />
                    ),
                }}
            />
            <Stack.Screen
                name='ScenarioBoard'
                component={ScenarioBoard}
                options={{
                    header: ({ navigation, scene }) => (
                        <Header title='Tutorial' navigation={navigation} scene={scene} back />
                    ),
                }}
            />
        </Stack.Navigator>
    );
}

export default function AppStack(props) {
    const { user, logOut } = useAuth();
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const { height } = useWindowDimensions();

    // Use compact mode on smaller screens (iPhone SE, etc.)
    const isCompact = height < 700;

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                drawerStyle: {
                    backgroundColor: 'transparent',
                    width: width * 0.75,
                },
                drawerActiveTintColor: '#fff',
                drawerInactiveTintColor: '#b0c4de',
                drawerLabelStyle: {
                    fontSize: isCompact ? 15 : 18,
                    fontWeight: '500',
                },
                drawerItemStyle: {
                    marginVertical: isCompact ? 2 : 5,
                    borderRadius: 8,
                },
                drawerActiveBackgroundColor: 'rgba(255, 255, 255, 0.15)',
            }}
            initialRouteName='Home'
        >
            <Drawer.Screen
                name='Home'
                component={HomeStack}
                options={{
                    drawerIcon: ({ focused, color }) => (
                        <Icon
                            size={isCompact ? 20 : 24}
                            name='home'
                            family='font-awesome'
                            color={color}
                        />
                    ),
                    headerShown: false,
                }}
            />

            {user ? (
                <>
                    <Drawer.Screen
                        name='Friends'
                        component={Friends}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='users'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            header: ({ navigation, scene }) => (
                                <Header
                                    title='Friends'
                                    navigation={navigation}
                                    scene={scene}
                                    user={user}
                                />
                            ),
                        }}
                    />
                    <Drawer.Screen
                        name='Stats'
                        component={Stats}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='line-chart'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            header: ({ navigation, scene }) => (
                                <Header
                                    title='Stats'
                                    navigation={navigation}
                                    scene={scene}
                                    user={user}
                                />
                            ),
                        }}
                    />
                    <Drawer.Screen
                        name='How-To Play'
                        component={HowToPlayStack}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='question-circle'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            headerShown: false,
                        }}
                    />
                    <Drawer.Screen
                        name='Settings'
                        component={Settings}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='cog'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            drawerItemStyle: {
                                marginTop: 'auto',
                            },
                            header: ({ navigation, scene }) => (
                                <Header
                                    title='Settings'
                                    navigation={navigation}
                                    scene={scene}
                                    user={user}
                                />
                            ),
                        }}
                    />
                    <Drawer.Screen
                        name='Log Out'
                        component={Login}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='sign-out'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            drawerItemStyle: {
                                marginTop: isCompact ? 12 : 16,
                                marginBottom: isCompact ? 10 : 20,
                            },
                        }}
                        listeners={{
                            drawerItemPress: (e) => {
                                e.preventDefault();
                                showAlert('Log Out', 'Are you sure you want to log out?', [
                                    {
                                        text: 'Cancel',
                                        style: 'cancel',
                                    },
                                    {
                                        text: 'Log Out',
                                        style: 'destructive',
                                        onPress: () => logOut(),
                                    },
                                ]);
                            },
                        }}
                    />
                </>
            ) : (
                <>
                    <Drawer.Screen
                        name='How-To Play'
                        component={HowToPlayStack}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='question-circle'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            headerShown: false,
                        }}
                    />
                    <Drawer.Screen
                        name='Log In'
                        component={Login}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='sign-in'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            drawerItemStyle: {
                                marginTop: 'auto',
                                marginBottom: isCompact ? 10 : 20,
                            },
                            header: ({ navigation, scene }) => (
                                <Header title='Log In' navigation={navigation} scene={scene} />
                            ),
                        }}
                    />
                </>
            )}
        </Drawer.Navigator>
    );
}
