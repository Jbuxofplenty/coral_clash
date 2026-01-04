import { ActivityIndicator, Dimensions, Linking, useWindowDimensions, View } from 'react-native';
import { Header, Icon } from '../components';
import { RULES_VIDEO_URL } from '../constants';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { useAlert, useAuth, useTheme } from '../contexts';
import Friends from '../screens/Friends';
import GameScreen from '../screens/Game';
import HomeScreen from '../screens/Home';
import HowToPlay from '../screens/HowToPlay';
import Login from '../screens/Login';
import ReportIssue from '../screens/ReportIssue';
import ScenarioBoard from '../screens/ScenarioBoard';
import Settings from '../screens/Settings';
import Stats from '../screens/Stats';
import CustomDrawerContent from './Menu';

const { width } = Dimensions.get('screen');

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function HomeStack(_props) {
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

function HowToPlayStack(_props) {
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

export default function AppStack(_props) {
    const { user, loading, logOut } = useAuth();
    const { showAlert } = useAlert();
    const { colors } = useTheme();
    const { height } = useWindowDimensions();

    // Use compact mode on smaller screens (iPhone SE, etc.)
    const isCompact = height < 700;

    // Show loading indicator while checking authentication
    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.GRADIENT_END,
                }}
            >
                <ActivityIndicator size='large' color={colors.PRIMARY} />
            </View>
        );
    }

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
                    drawerIcon: ({ _focused, color }) => (
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
                            drawerIcon: ({ _focused: _focused, color }) => (
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
                            drawerIcon: ({ _focused, color }) => (
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
                            drawerIcon: ({ _focused, color }) => (
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
                        name='Rules Video'
                        component={View}
                        options={{
                            drawerIcon: ({ _focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='youtube-play'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            headerShown: false,
                        }}
                        listeners={({ navigation }) => ({
                            drawerItemPress: (e) => {
                                e.preventDefault();
                                Linking.openURL(RULES_VIDEO_URL);
                                navigation.closeDrawer();
                            },
                        })}
                    />
                    <Drawer.Screen
                        name='Report Issue'
                        component={ReportIssue}
                        options={{
                            drawerIcon: ({ _focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='bug'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            header: ({ navigation, scene }) => (
                                <Header
                                    title='Report Issue'
                                    navigation={navigation}
                                    scene={scene}
                                    user={user}
                                />
                            ),
                            drawerItemStyle: {
                                marginTop: isCompact ? 12 : 16,
                            },
                        }}
                    />
                    <Drawer.Screen
                        name='Settings'
                        component={Settings}
                        options={{
                            drawerIcon: ({ _focused, color }) => (
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
                            drawerIcon: ({ _focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='sign-out'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                        }}
                        listeners={({ navigation }) => ({
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
                                        onPress: async () => {
                                            try {
                                                await logOut();
                                                // Navigate to home screen and close drawer after successful logout
                                                navigation.navigate('Home');
                                            } catch (error) {
                                                console.error('Error during logout:', error);
                                            }
                                        },
                                    },
                                ]);
                            },
                        })}
                    />
                </>
            ) : (
                <>
                    <Drawer.Screen
                        name='How-To Play'
                        component={HowToPlayStack}
                        options={{
                            drawerIcon: ({ _focused, color }) => (
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
                        name='Rules Video'
                        component={View}
                        options={{
                            drawerIcon: ({ _focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='youtube-play'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            headerShown: false,
                        }}
                        listeners={({ navigation }) => ({
                            drawerItemPress: (e) => {
                                e.preventDefault();
                                Linking.openURL(RULES_VIDEO_URL);
                                navigation.closeDrawer();
                            },
                        })}
                    />
                    <Drawer.Screen
                        name='Report Issue'
                        component={ReportIssue}
                        options={{
                            drawerIcon: ({ _focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='bug-report'
                                    family='MaterialIcons'
                                    color={color}
                                />
                            ),
                            header: ({ navigation, scene }) => (
                                <Header
                                    title='Report Issue'
                                    navigation={navigation}
                                    scene={scene}
                                />
                            ),
                            drawerItemStyle: {
                                marginTop: 'auto',
                            },
                        }}
                    />
                    <Drawer.Screen
                        name='Log In'
                        component={Login}
                        options={{
                            drawerIcon: ({ _focused: _focused, color }) => (
                                <Icon
                                    size={isCompact ? 20 : 24}
                                    name='sign-in'
                                    family='font-awesome'
                                    color={color}
                                />
                            ),
                            drawerItemStyle: {
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
