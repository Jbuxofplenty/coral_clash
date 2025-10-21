import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Block, Text } from 'galio-framework';
import React from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_AVATARS, DEFAULT_AVATAR_NAME } from '../constants/avatars';

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

    // Get avatar key from user data, fallback to default
    const avatarKey = user?.avatarKey || DEFAULT_AVATAR_NAME;
    const avatarSource = DEFAULT_AVATARS[avatarKey] || DEFAULT_AVATARS[DEFAULT_AVATAR_NAME];

    return (
        <DrawerContentScrollView {...props} style={styles.container}>
            <Block style={[styles.header, { paddingTop: insets.top + 20 }]}>
                {user && (
                    <View style={styles.profileContainer}>
                        <Image source={avatarSource} style={styles.avatar} resizeMode='contain' />
                        <Text size={16} color='white' style={styles.userName}>
                            {user.displayName || user.email}
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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        backgroundColor: '#1e3c72',
        paddingHorizontal: 24,
        paddingBottom: 24,
        marginBottom: 16,
    },
    profileContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 0,
        borderWidth: 3,
        borderColor: '#fff',
        backgroundColor: '#fff',
        marginBottom: 12,
        padding: 8,
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
