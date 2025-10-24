import { useNavigation } from '@react-navigation/native';
import { Block, NavBar, theme } from 'galio-framework';

import React from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';

import materialTheme from '../constants/theme';
import { useAuth, useTheme } from '../contexts';
import Avatar from './Avatar';

const { height, width } = Dimensions.get('window');
const iPhoneX = () =>
    Platform.OS === 'ios' && (height === 812 || width === 812 || height === 896 || width === 896);

function Header({ back, title, transparent }) {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { colors } = useTheme();

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
        paddingVertical: 10,
        shadowColor: colors.SHADOW,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        shadowOpacity: 0.2,
        elevation: 3,
    };

    const navbarStyles = {
        ...styles.navbar,
        backgroundColor: colors.CARD_BACKGROUND,
    };

    return (
        <Block style={headerStyles}>
            <NavBar
                back={back}
                title={title}
                style={navbarStyles}
                transparent={transparent}
                right={renderRight()}
                rightStyle={{ alignItems: 'center' }}
                leftStyle={{ flex: 0.3, paddingTop: 2 }}
                leftIconName={back ? 'chevron-left' : 'navicon'}
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
    button: {
        padding: 12,
        position: 'relative',
    },
    title: {
        fontSize: 18,
        fontWeight: 600,
    },
    navbar: {
        paddingVertical: 0,
        paddingBottom: theme.SIZES.BASE * 1.5,
        paddingTop: iPhoneX ? theme.SIZES.BASE * 4 : theme.SIZES.BASE,
        zIndex: 5,
    },
    notify: {
        backgroundColor: materialTheme.COLORS.LABEL,
        borderRadius: 4,
        height: theme.SIZES.BASE / 2,
        width: theme.SIZES.BASE / 2,
        position: 'absolute',
        top: 8,
        right: 8,
    },
    divider: {
        borderRightWidth: 0.3,
        borderRightColor: theme.COLORS.MUTED,
    },
    search: {
        height: 48,
        width: width - 32,
        marginHorizontal: 16,
        borderWidth: 1,
        borderRadius: 3,
    },
});
