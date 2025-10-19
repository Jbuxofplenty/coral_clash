import { LinearGradient } from 'expo-linear-gradient';
import { Block, Text, theme } from 'galio-framework';
import React from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';

import { materialTheme } from '../constants';

const { width, height } = Dimensions.get('screen');

export default class Login extends React.Component {
    render() {
        return (
            <LinearGradient colors={['#1e3c72', '#2a5298', '#7e8ba3']} style={styles.gradient}>
                <Block flex center middle style={styles.container}>
                    <Block style={styles.card}>
                        <Text h3 bold color='#1e3c72' style={styles.title}>
                            Welcome to Coral Clash
                        </Text>
                        <Text size={16} color={materialTheme.COLORS.MUTED} style={styles.subtitle}>
                            Sign in to play against the computer or challenge other players online.
                        </Text>
                        <Block style={styles.comingSoon}>
                            <Text size={14} color={materialTheme.COLORS.MUTED} center>
                                Authentication coming soon...
                            </Text>
                        </Block>
                    </Block>
                </Block>
            </LinearGradient>
        );
    }
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: width,
        height: height,
    },
    container: {
        width: width,
        paddingHorizontal: theme.SIZES.BASE * 2,
    },
    card: {
        backgroundColor: theme.COLORS.WHITE,
        borderRadius: 12,
        padding: theme.SIZES.BASE * 3,
        width: '100%',
        maxWidth: 400,
        shadowColor: theme.COLORS.BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        shadowOpacity: 0.3,
        elevation: 8,
    },
    title: {
        marginBottom: theme.SIZES.BASE,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: theme.SIZES.BASE * 2,
        lineHeight: 22,
    },
    comingSoon: {
        paddingTop: theme.SIZES.BASE * 2,
        borderTopWidth: 1,
        borderTopColor: '#e8e8e8',
    },
});
