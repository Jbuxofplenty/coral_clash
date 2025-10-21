import { useNavigation } from '@react-navigation/native';
import { Block, NavBar, theme } from 'galio-framework';

import React from 'react';
import { Dimensions, Platform, StyleSheet, View, Image } from 'react-native';

import materialTheme from '../constants/Theme';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_AVATARS, DEFAULT_AVATAR_NAME } from '../constants/avatars';

const { height, width } = Dimensions.get('window');
const iPhoneX = () =>
    Platform.OS === 'ios' && (height === 812 || width === 812 || height === 896 || width === 896);

class Header extends React.Component {
    handleLeftPress = () => {
        const { back, navigation } = this.props;
        return back ? navigation.goBack() : navigation.openDrawer();
    };

    renderRight = () => {
        const { user } = this.props;

        if (!user) {
            return null;
        }

        // Get avatar key from user data, fallback to default
        const avatarKey = user.avatarKey || DEFAULT_AVATAR_NAME;
        const avatarSource = DEFAULT_AVATARS[avatarKey] || DEFAULT_AVATARS[DEFAULT_AVATAR_NAME];

        return (
            <View style={styles.profileButton}>
                <Image source={avatarSource} style={styles.profileAvatar} resizeMode='contain' />
            </View>
        );
    };

    render() {
        const { back, title, white, transparent, user } = this.props;
        const headerStyles = [
            styles.shadow,
            transparent ? { backgroundColor: 'rgba(0,0,0,0)' } : null,
            { marginTop: 10 },
        ];

        return (
            <Block style={headerStyles}>
                <NavBar
                    back={back}
                    title={title}
                    style={styles.navbar}
                    transparent={transparent}
                    right={this.renderRight()}
                    rightStyle={{ alignItems: 'center' }}
                    leftStyle={{ flex: 0.3, paddingTop: 2 }}
                    leftIconName={back ? 'chevron-left' : 'navicon'}
                    leftIconSize={30}
                    leftIconColor={white ? theme.COLORS.WHITE : theme.COLORS.ICON}
                    titleStyle={[styles.title, { color: theme.COLORS[white ? 'WHITE' : 'ICON'] }]}
                    onLeftPress={this.handleLeftPress}
                />
            </Block>
        );
    }
}

// HOC to inject navigation prop and auth from hooks into class component
const HeaderWithNavigation = (props) => {
    const navigation = useNavigation();
    const { user } = useAuth();
    return <Header {...props} navigation={navigation} user={user} />;
};

export default HeaderWithNavigation;

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
    shadow: {
        backgroundColor: theme.COLORS.WHITE,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        shadowOpacity: 0.2,
        elevation: 3,
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
    header: {
        backgroundColor: theme.COLORS.WHITE,
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
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 0,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        overflow: 'hidden',
    },
    profileAvatar: {
        width: 36,
        height: 36,
    },
});
