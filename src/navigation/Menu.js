import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Block, Text } from 'galio-framework';
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components';
import { useAuth, useTheme } from '../contexts';

// Re-export for backward compatibility
export {
    AVATAR_KEYS,
    DEFAULT_AVATARS,
    DEFAULT_AVATAR_NAME,
    getRandomAvatarKey,
} from '../constants/avatars';

function CustomDrawerContent(props) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { colors } = useTheme();
    const { height } = useWindowDimensions();

    // Use compact mode on smaller screens (iPhone SE, etc.)
    const isCompact = height < 700;

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
                <Block
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + (isCompact ? 10 : 20),
                        },
                        isCompact && styles.headerCompact,
                    ]}
                >
                    {user && (
                        <View
                            style={[
                                styles.profileContainer,
                                isCompact && styles.profileContainerCompact,
                            ]}
                        >
                            <Avatar
                                size={isCompact ? 'large' : 'xlarge'}
                                style={styles.avatar}
                                showBorder={true}
                            />
                            <Text size={isCompact ? 13 : 16} color='white' style={styles.userName}>
                                {getDisplayName()}
                            </Text>
                        </View>
                    )}

                    <Text
                        size={isCompact ? 18 : 24}
                        color='white'
                        style={[styles.title, isCompact && styles.titleCompact]}
                    >
                        Coral Clash
                    </Text>
                    <Text size={isCompact ? 11 : 14} color='white' style={styles.subtitle}>
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
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        marginBottom: 16,
    },
    headerCompact: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        marginBottom: 8,
    },
    profileContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    profileContainerCompact: {
        marginBottom: 12,
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
    titleCompact: {
        marginBottom: 2,
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
