import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Block, Text } from 'galio-framework';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Avatar } from '../components';

// Re-export for backward compatibility
export {
    DEFAULT_AVATARS,
    AVATAR_KEYS,
    DEFAULT_AVATAR_NAME,
    getRandomAvatarKey,
} from '../constants/avatars';

function CustomDrawerContent(props) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { colors } = useTheme();

    // Format display name with discriminator
    const getDisplayName = () => {
        if (!user) return '';
        const name = user.displayName || user.email || 'User';
        if (user.discriminator) {
            return `${name} #${user.discriminator}`;
        }
        return name;
    };

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.gradient}
        >
            <DrawerContentScrollView
                {...props}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <Block style={[styles.header, { paddingTop: insets.top + 20 }]}>
                    {user && (
                        <View style={styles.profileContainer}>
                            <Avatar size='xlarge' style={styles.avatar} showBorder={true} />
                            <Text size={16} color='white' style={styles.userName}>
                                {getDisplayName()}
                            </Text>
                        </View>
                    )}

                    <Text h4 color='white' style={styles.title}>
                        Coral Clash
                    </Text>
                    <Text size={14} color='white' style={styles.subtitle}>
                        Ocean Strategy Game
                    </Text>
                </Block>

                <Block style={styles.drawerItems}>
                    <DrawerItemList {...props} />
                </Block>
            </DrawerContentScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        marginBottom: 16,
    },
    profileContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        marginBottom: 12,
        borderColor: '#fff',
    },
    userName: {
        fontWeight: '600',
        textAlign: 'center',
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        opacity: 0.8,
    },
    drawerItems: {
        flex: 1,
        paddingTop: 10,
    },
});

export default CustomDrawerContent;
