import { useNavigation } from '@react-navigation/native';
import { Block, NavBar, Text, theme } from 'galio-framework';

import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
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

    const handleAvatarPress = () => {
        navigation.navigate('Settings');
    };

    const renderRight = () => {
        if (!user) {
            return null;
        }

        const elo = user.stats?.elo || 1200;

        return (
            <Block row middle style={{ flexWrap: 'nowrap' }}>
                <Block
                    row
                    middle
                    style={{
                        backgroundColor: colors.PRIMARY + '20',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                        marginRight: 8,
                        borderWidth: 1,
                        borderColor: colors.PRIMARY + '40',
                        minWidth: 75,
                        justifyContent: 'center',
                        flexWrap: 'nowrap',
                    }}
                >
                    <Text size={10} bold color={colors.PRIMARY} style={{ marginRight: 4 }} numberOfLines={1}>
                        ELO
                    </Text>
                    <Text size={12} bold color={colors.PRIMARY} numberOfLines={1}>
                        {elo}
                    </Text>
                </Block>
                <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.7}>
                    <Avatar size="medium" style={{ marginRight: 8 }} />
                </TouchableOpacity>
            </Block>
        );
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
                    flex: 0.35,
                    paddingRight: 8,
                }}
                leftStyle={{ flex: 0.35, paddingTop: 2 }}
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
        fontWeight: '600',
        textAlign: 'center',
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
