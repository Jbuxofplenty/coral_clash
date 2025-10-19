import { Dimensions } from 'react-native';
import { Icon } from '../components';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import GameScreen from '../screens/Game';
import HomeScreen from '../screens/Home';
import Login from '../screens/Login';
import CustomDrawerContent from './Menu';

const { width } = Dimensions.get('screen');

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function HomeStack(props) {
    return (
        <Stack.Navigator initialRouteName='Dashboard'>
            <Stack.Screen
                name='Dashboard'
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen name='Game' component={GameScreen} />
        </Stack.Navigator>
    );
}

export default function AppStack(props) {
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
                }}
            />
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
        </Drawer.Navigator>
    );
}
