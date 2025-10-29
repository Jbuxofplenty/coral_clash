import { useNavigation } from '@react-navigation/native';
import { Block, NavBar, theme } from 'galio-framework';

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, useTheme } from '../contexts';
import Avatar from './Avatar';

function Header({ back, title, transparent }) {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const handleLeftPress = () => {
        return back ? navigation.goBack() : navigation.openDrawer();
    };

    const renderRight = () => {
        if (!user) {
            return null;
        }

        return <Avatar size='medium' style={{ marginRight: 8 }} />;
    };

    const headerStyles = {
        backgroundColor: transparent ? 'rgba(0,0,0,0)' : colors.CARD_BACKGROUND,
        paddingTop: insets.top,
        borderWidth: 0,
    };

    const navbarStyles = {
        ...styles.navbar,
        backgroundColor: 'transparent',
        borderWidth: 0,
    };

    return (
        <Block style={headerStyles} shadow={false}>
            <NavBar
                back={back}
                title={title}
                style={navbarStyles}
                transparent={transparent}
                right={renderRight()}
                rightStyle={{
                    alignItems: 'center',
                    ...(Platform.OS === 'android' && { flex: 0.3 }),
                }}
                leftStyle={{ flex: 0.3, paddingTop: 2 }}
                leftIconName={back ? 'chevron-left' : 'menu'}
                leftIconSize={back ? 50 : 30}
                leftIconColor={colors.ICON}
                titleStyle={[styles.title, { color: colors.TEXT }]}
                onLeftPress={handleLeftPress}
            />
        </Block>
    );
}

export default Header;

const styles = StyleSheet.create({
    title: {
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
        width: '100%',
    },
    navbar: {
        paddingVertical: 0,
        paddingBottom: theme.SIZES.BASE * 1.5,
        paddingTop: theme.SIZES.BASE,
        zIndex: 5,
        borderWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
    },
});
