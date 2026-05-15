import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './Icon';

const { width, height } = Dimensions.get('window');

/**
 * FreeTrialGateModal
 * Soft-gate shown to guest users after their free trial games are exhausted.
 *
 * @param {boolean}  visible      — whether to show the modal
 * @param {function} onSignIn     — called when user taps "Sign In / Create Account"
 * @param {function} onDismiss    — called when user taps "Maybe Later"
 */
export default function FreeTrialGateModal({ visible, onSignIn, onDismiss }) {
    const { t } = useTranslation();
    const { colors, isDarkMode } = useTheme();

    // Slide-up + fade-in animation
    const slideAnim = useRef(new Animated.Value(80)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Subtle pulse on the coral icon
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(80);
            fadeAnim.setValue(0);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 9,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Start pulse loop on the icon
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.12,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ]),
            ).start();
        } else {
            pulseAnim.stopAnimation();
        }
    }, [visible, slideAnim, fadeAnim, pulseAnim]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onDismiss}
                />

                {/* Card */}
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={
                            isDarkMode
                                ? ['#0d2137', '#0a3d4a', '#0d3a2a']
                                : ['#e0f4f8', '#c8eef7', '#d4f5e5']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        {/* Decorative top glow */}
                        <View
                            style={[
                                styles.glowBar,
                                { backgroundColor: isDarkMode ? 'rgba(0,210,180,0.35)' : 'rgba(0,180,160,0.18)' },
                            ]}
                        />

                        {/* Icon */}
                        <Animated.View
                            style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}
                        >
                            <LinearGradient
                                colors={['#00c9a7', '#00aec9']}
                                style={styles.iconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.coralEmoji}>🐚</Text>
                            </LinearGradient>
                        </Animated.View>

                        {/* Title */}
                        <Text style={[styles.title, { color: isDarkMode ? '#e8f8f5' : '#0a3d4a' }]}>
                            {t('cards.freeTrial.gateTitle')}
                        </Text>

                        {/* Message */}
                        <Text style={[styles.message, { color: isDarkMode ? '#a8d8d0' : '#1a5c6a' }]}>
                            {t('cards.freeTrial.gateMessage')}
                        </Text>

                        {/* Feature pills */}
                        <View style={styles.pillRow}>
                            <FeaturePill icon="trophy" label={t('cards.freeTrial.pill1')} isDarkMode={isDarkMode} />
                            <FeaturePill icon="globe" label={t('cards.freeTrial.pill2')} isDarkMode={isDarkMode} />
                            <FeaturePill icon="line-chart" label={t('cards.freeTrial.pill3')} isDarkMode={isDarkMode} />
                        </View>

                        {/* Primary CTA */}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={onSignIn}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#00c9a7', '#00aec9']}
                                style={styles.primaryButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Icon name="sign-in" family="font-awesome" size={18} color="#fff" />
                                <Text style={styles.primaryButtonText}>
                                    {t('cards.freeTrial.signIn')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Secondary dismiss */}
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onDismiss}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.secondaryButtonText, { color: isDarkMode ? '#6ba8a0' : '#4a8a8a' }]}>
                                {t('cards.freeTrial.maybeLater')}
                            </Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

function FeaturePill({ icon, label, isDarkMode }) {
    return (
        <View
            style={[
                styles.pill,
                {
                    backgroundColor: isDarkMode ? 'rgba(0,201,167,0.15)' : 'rgba(0,174,201,0.12)',
                    borderColor: isDarkMode ? 'rgba(0,201,167,0.35)' : 'rgba(0,174,201,0.3)',
                },
            ]}
        >
            <Icon name={icon} family="font-awesome" size={12} color={isDarkMode ? '#00c9a7' : '#008a8a'} />
            <Text style={[styles.pillText, { color: isDarkMode ? '#b0e0d8' : '#1a5c6a' }]}>{label}</Text>
        </View>
    );
}

const CARD_WIDTH = Math.min(width - 40, 380);

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    card: {
        width: CARD_WIDTH,
        borderRadius: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#00c9a7',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 20,
            },
            android: { elevation: 16 },
        }),
    },
    gradient: {
        paddingTop: 8,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    glowBar: {
        width: '60%',
        height: 3,
        borderRadius: 2,
        marginBottom: 24,
    },
    iconWrapper: {
        marginBottom: 20,
    },
    iconGradient: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coralEmoji: {
        fontSize: 36,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 12,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    primaryButton: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 15,
        paddingHorizontal: 24,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    secondaryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
