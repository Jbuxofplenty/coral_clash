import { Dimensions, Alert } from 'react-native';
import { Icon, Header } from '../components';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import GameScreen from '../screens/Game';
import HomeScreen from '../screens/Home';
import Login from '../screens/Login';
import Settings from '../screens/Settings';
import CustomDrawerContent from './Menu';
import { useAuth } from '../contexts/AuthContext';

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
            <Stack.Screen name='Game' component={GameScreen} />
        </Stack.Navigator>
    );
}

export default function AppStack(props) {
    const { user, logOut } = useAuth();

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                drawerStyle: {
                    backgroundColor: '#1e3c72',
                    width: width * 0.75,
                },
                drawerActiveTintColor: '#fff',
                drawerInactiveTintColor: '#b0c4de',
                drawerLabelStyle: {
                    fontSize: 18,
                    fontWeight: '500',
                },
                drawerItemStyle: {
                    marginVertical: 5,
                    borderRadius: 8,
                },
                drawerActiveBackgroundColor: '#2a5298',
            }}
            initialRouteName='Home'
        >
            <Drawer.Screen
                name='Home'
                component={HomeStack}
                options={{
                    drawerIcon: ({ focused, color }) => (
                        <Icon size={24} name='home' family='font-awesome' color={color} />
                    ),
                    headerShown: false,
                }}
            />

            {user ? (
                <>
                    <Drawer.Screen
                        name='Settings'
                        component={Settings}
                        options={{
                            drawerIcon: ({ focused, color }) => (
                                <Icon size={24} name='cog' family='font-awesome' color={color} />
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
                                    size={24}
                                    name='sign-out'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            drawerItemStyle: {
                                marginBottom: 20,
                            },
                        }}
                        listeners={{
                            drawerItemPress: (e) => {
                                e.preventDefault();
                                Alert.alert(
                                    'Log Out',
                                    'Are you sure you want to log out?',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Log Out',
                                            style: 'destructive',
                                            onPress: () => logOut(),
                                        },
                                    ],
                                    { cancelable: true },
                                );
                            },
                        }}
                    />
                </>
            ) : (
                <Drawer.Screen
                    name='Log In'
                    component={Login}
                    options={{
                        drawerIcon: ({ focused, color }) => (
                            <Icon size={24} name='sign-in' family='font-awesome' color={color} />
                        ),
                        drawerItemStyle: {
                            marginTop: 'auto',
                            marginBottom: 20,
                        },
                    }}
                />
            )}
        </Drawer.Navigator>
    );
}
