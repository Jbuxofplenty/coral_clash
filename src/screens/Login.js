import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Block, Button, Input, Text, theme } from 'galio-framework';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { moderateScale, verticalScale } from 'react-native-size-matters';

import { useAuth, useTheme } from '../contexts';
import i18n from '../i18n';

const { width, height } = Dimensions.get('screen');
const isTablet = width >= 768;

function Login({ navigation }) {
    const {
        user,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        resetPassword,
        loading: authLoading,
        error: authError,
    } = useAuth();
    const { colors } = useTheme();
    const [isSignUp, setIsSignUp] = React.useState(false);
    const [showForgotPassword, setShowForgotPassword] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [displayName, setDisplayName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [successMessage, setSuccessMessage] = React.useState('');
    const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);

    // Refs for input fields
    const displayNameRef = React.useRef(null);
    const emailRef = React.useRef(null);
    const passwordRef = React.useRef(null);

    // Check if Apple Authentication is available
    // iOS: Native support (iOS 13+)
    // Android: Requires OAuth setup with Apple Developer account
    React.useEffect(() => {
        const checkAppleAuthAvailability = async () => {
            try {
                const available = await AppleAuthentication.isAvailableAsync();
                setIsAppleAuthAvailable(available);
            } catch (error) {
                console.log('🍎 Apple Sign-In check error:', error);
                setIsAppleAuthAvailable(false);
            }
        };
        checkAppleAuthAvailability();
    }, []);

    // Redirect to Home if user is already logged in
    React.useEffect(() => {
        if (user) {
            navigation.navigate('Home');
        }
    }, [user, navigation]);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError(i18n.t('login.fillAll'));
            return;
        }

        if (isSignUp) {
            const trimmedDisplayName = displayName?.trim();

            if (!trimmedDisplayName) {
                setError(i18n.t('login.usernameRequired'));
                return;
            }

            if (trimmedDisplayName.length < 2) {
                setError(i18n.t('login.usernameMin'));
                return;
            }

            if (trimmedDisplayName.length > 30) {
                setError(i18n.t('login.usernameMax'));
                return;
            }

            // Check for valid characters (alphanumeric, spaces, underscores, hyphens)
            if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedDisplayName)) {
                setError(i18n.t('login.usernameChars'));
                return;
            }
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (isSignUp) {
                await signUp(email, password, displayName.trim());
            } else {
                await signIn(email, password);
            }
            // Navigation will be handled by auth state change
        } catch (err) {
            setError(err.message || i18n.t('login.authFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const result = await signInWithGoogle();
            // If result is null, user cancelled - no error needed
            if (result === null) {
                console.log('User cancelled Google Sign-In');
            }
        } catch (err) {
            setError(err.message || i18n.t('login.googleFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            const result = await signInWithApple();
            // If result is null, user cancelled - no error needed
            if (result === null) {
                console.log('User cancelled Apple Sign-In');
            }
        } catch (err) {
            setError(err.message || i18n.t('login.appleFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError(i18n.t('login.emailRequired'));
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            await resetPassword(email);
            setSuccessMessage(i18n.t('login.resetSent'));
            setShowForgotPassword(false);
        } catch (err) {
            setError(err.message || i18n.t('login.resetFailed'));
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setShowForgotPassword(false);
        setError('');
        setSuccessMessage('');
    };

    const toggleForgotPassword = () => {
        setShowForgotPassword(!showForgotPassword);
        setError('');
        setSuccessMessage('');
    };

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.gradient}
        >
            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps='handled'
                enableOnAndroid={true}
                enableAutomaticScroll={true}
                extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
                extraHeight={Platform.OS === 'ios' ? 120 : 140}
                showsVerticalScrollIndicator={false}
            >
                <Block flex center middle style={styles.container}>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <Text
                            size={isTablet ? moderateScale(20) : moderateScale(32)}
                            bold
                            color={colors.PRIMARY}
                            style={styles.title}
                        >
                            {showForgotPassword
                                ? i18n.t('login.resetTitle')
                                : isSignUp
                                  ? i18n.t('login.createAccount')
                                  : i18n.t('login.welcome')}
                        </Text>
                        <Block style={styles.subtitleContainer}>
                            <Text
                                size={isTablet ? moderateScale(10) : moderateScale(16)}
                                color={colors.TEXT_SECONDARY}
                                style={styles.subtitle}
                            >
                                {showForgotPassword
                                    ? i18n.t('login.resetDesc')
                                    : isSignUp
                                      ? i18n.t('login.createDesc')
                                      : i18n.t('login.signinDesc')}
                            </Text>
                        </Block>

                        {error || authError ? (
                            <Block style={styles.errorContainer}>
                                <Text
                                    size={isTablet ? moderateScale(10) : moderateScale(14)}
                                    color={colors.ERROR}
                                    center
                                >
                                    {error || authError}
                                </Text>
                            </Block>
                        ) : null}

                        {successMessage ? (
                            <Block style={styles.successContainer}>
                                <Text
                                    size={isTablet ? moderateScale(10) : moderateScale(14)}
                                    color={colors.SUCCESS}
                                    center
                                >
                                    {successMessage}
                                </Text>
                            </Block>
                        ) : null}

                        <Block style={styles.form}>
                            {!showForgotPassword && (
                                <>
                                    {isAppleAuthAvailable && (
                                        <TouchableOpacity
                                            style={[
                                                styles.appleButton,
                                                {
                                                    backgroundColor: colors.CARD_BACKGROUND,
                                                    borderColor: colors.BORDER_COLOR,
                                                },
                                            ]}
                                            onPress={handleAppleSignIn}
                                            disabled={loading || authLoading}
                                        >
                                            <Ionicons
                                                name='logo-apple'
                                                size={verticalScale(24)}
                                                color={colors.TEXT}
                                            />
                                            <Text
                                                size={
                                                    isTablet ? moderateScale(10) : moderateScale(16)
                                                }
                                                color={colors.TEXT}
                                                style={styles.appleButtonText}
                                            >
                                                {isSignUp
                                                    ? i18n.t('login.appleSignup')
                                                    : i18n.t('login.appleSignin')}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[
                                            styles.googleButton,
                                            {
                                                backgroundColor: colors.CARD_BACKGROUND,
                                                borderColor: colors.BORDER_COLOR,
                                            },
                                        ]}
                                        onPress={handleGoogleSignIn}
                                        disabled={loading || authLoading}
                                    >
                                        <Ionicons
                                            name='logo-google'
                                            size={verticalScale(24)}
                                            color='#DB4437'
                                        />
                                        <Text
                                            size={isTablet ? moderateScale(10) : moderateScale(16)}
                                            color={colors.TEXT}
                                            style={styles.googleButtonText}
                                        >
                                            {isSignUp
                                                ? i18n.t('login.googleSignup')
                                                : i18n.t('login.googleSignin')}
                                        </Text>
                                    </TouchableOpacity>

                                    <View style={styles.dividerContainer}>
                                        <View
                                            style={[
                                                styles.divider,
                                                { backgroundColor: colors.BORDER_COLOR },
                                            ]}
                                        />
                                        <Text
                                            size={isTablet ? moderateScale(10) : moderateScale(14)}
                                            color={colors.TEXT_SECONDARY}
                                            style={styles.dividerText}
                                        >
                                            {i18n.t('login.or')}
                                        </Text>
                                        <View
                                            style={[
                                                styles.divider,
                                                { backgroundColor: colors.BORDER_COLOR },
                                            ]}
                                        />
                                    </View>
                                </>
                            )}

                            {!showForgotPassword && isSignUp && (
                                <Input
                                    ref={displayNameRef}
                                    placeholder={i18n.t('login.usernamePlaceholder')}
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.BACKGROUND,
                                            borderColor: colors.BORDER_COLOR,
                                        },
                                    ]}
                                    color={colors.TEXT}
                                    placeholderTextColor={colors.PLACEHOLDER}
                                    autoCapitalize='words'
                                    autoCorrect={false}
                                    textContentType='nickname'
                                    autoComplete='name'
                                    returnKeyType='next'
                                    onSubmitEditing={() => emailRef.current?.focus()}
                                />
                            )}
                            <Input
                                ref={emailRef}
                                placeholder={i18n.t('login.emailPlaceholder')}
                                value={email}
                                onChangeText={setEmail}
                                style={[
                                    styles.input,
                                    {
                                        backgroundColor: colors.BACKGROUND,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                ]}
                                color={colors.TEXT}
                                placeholderTextColor={colors.PLACEHOLDER}
                                keyboardType='email-address'
                                autoCapitalize='none'
                                autoCorrect={false}
                                textContentType={isSignUp ? 'username' : 'username'}
                                autoComplete={isSignUp ? 'email' : 'username'}
                                returnKeyType={showForgotPassword ? 'done' : 'next'}
                                onSubmitEditing={() => {
                                    if (showForgotPassword) {
                                        handleForgotPassword();
                                    } else {
                                        passwordRef.current?.focus();
                                    }
                                }}
                            />
                            {!showForgotPassword && (
                                <Input
                                    ref={passwordRef}
                                    placeholder={i18n.t('login.passwordPlaceholder')}
                                    value={password}
                                    onChangeText={setPassword}
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.BACKGROUND,
                                            borderColor: colors.BORDER_COLOR,
                                        },
                                    ]}
                                    color={colors.TEXT}
                                    placeholderTextColor={colors.PLACEHOLDER}
                                    password
                                    viewPass
                                    autoCapitalize='none'
                                    autoCorrect={false}
                                    textContentType={isSignUp ? 'newPassword' : 'password'}
                                    autoComplete={isSignUp ? 'password-new' : 'password'}
                                    returnKeyType='done'
                                    onSubmitEditing={handleSubmit}
                                />
                            )}

                            <Button
                                color={colors.PRIMARY}
                                style={styles.button}
                                onPress={showForgotPassword ? handleForgotPassword : handleSubmit}
                                disabled={loading || authLoading}
                            >
                                {loading || authLoading ? (
                                    <ActivityIndicator color='#fff' />
                                ) : (
                                    <Text bold size={moderateScale(16)} color='#fff'>
                                        {showForgotPassword
                                            ? i18n.t('login.sendResetLink')
                                            : isSignUp
                                              ? i18n.t('login.signup')
                                              : i18n.t('login.signin')}
                                    </Text>
                                )}
                            </Button>

                            {!showForgotPassword && !isSignUp && (
                                <TouchableOpacity
                                    onPress={toggleForgotPassword}
                                    style={styles.forgotPasswordButton}
                                >
                                    <Text
                                        size={isTablet ? moderateScale(10) : moderateScale(14)}
                                        color={colors.PRIMARY}
                                        center
                                    >
                                        {i18n.t('login.forgotPassword')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={showForgotPassword ? toggleForgotPassword : toggleMode}
                                style={styles.toggleButton}
                            >
                                <Text
                                    size={isTablet ? moderateScale(10) : moderateScale(14)}
                                    color={colors.PRIMARY}
                                    center
                                >
                                    {showForgotPassword
                                        ? i18n.t('login.backToSignin')
                                        : isSignUp
                                          ? i18n.t('login.alreadyHaveAccount')
                                          : i18n.t('login.dontHaveAccount')}
                                </Text>
                            </TouchableOpacity>
                        </Block>
                    </Block>
                </Block>
            </KeyboardAwareScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: width,
        height: height,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    container: {
        width: width,
        paddingHorizontal: theme.SIZES.BASE,
        paddingVertical: theme.SIZES.BASE * 2,
    },
    card: {
        borderRadius: 12,
        padding: isTablet ? theme.SIZES.BASE * 2.5 : theme.SIZES.BASE * 1.5,
        paddingVertical: isTablet ? theme.SIZES.BASE * 3 : theme.SIZES.BASE * 3,
        minHeight: width > 600 ? verticalScale(300) : width / 1.5,
        maxWidth: width > 600 ? Math.min(800, width * 0.8) : width - theme.SIZES.BASE * 2,
        width: width > 600 ? '100%' : 'auto',
        shadowColor: theme.COLORS.BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        shadowOpacity: 0.3,
        elevation: 8,
    },
    title: {
        marginBottom: isTablet ? theme.SIZES.BASE * 1.5 : theme.SIZES.BASE,
        textAlign: 'center',
    },
    subtitleContainer: {
        marginBottom: isTablet ? theme.SIZES.BASE * 2.5 : theme.SIZES.BASE * 2,
        paddingHorizontal: isTablet ? theme.SIZES.BASE : 0,
        minHeight: 'auto',
        flexShrink: 0,
    },
    subtitle: {
        textAlign: 'center',
        flexWrap: 'wrap',
    },
    form: {
        marginTop: theme.SIZES.BASE,
    },
    input: {
        marginBottom: theme.SIZES.BASE * 1.5,
        borderColor: '#e8e8e8',
        borderWidth: 1,
        borderRadius: 8,
    },
    button: {
        marginTop: theme.SIZES.BASE,
        width: '100%',
        height: isTablet ? verticalScale(56) : verticalScale(48),
        borderRadius: 8,
    },
    toggleButton: {
        marginTop: theme.SIZES.BASE * 2,
        paddingVertical: theme.SIZES.BASE,
    },
    errorContainer: {
        backgroundColor: '#ffe6e6',
        padding: theme.SIZES.BASE,
        borderRadius: 8,
        marginVertical: theme.SIZES.BASE,
    },
    successContainer: {
        backgroundColor: '#d4edda',
        padding: theme.SIZES.BASE,
        borderRadius: 8,
        marginVertical: theme.SIZES.BASE,
    },
    forgotPasswordButton: {
        marginTop: theme.SIZES.BASE,
        paddingVertical: theme.SIZES.BASE / 2,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: isTablet ? theme.SIZES.BASE * 1.5 : theme.SIZES.BASE * 2,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: theme.SIZES.BASE,
    },
    appleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: isTablet ? 14 : 12,
        paddingHorizontal: theme.SIZES.BASE,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        height: verticalScale(50),
        marginBottom: theme.SIZES.BASE,
    },
    appleButtonText: {
        marginLeft: theme.SIZES.BASE,
        fontWeight: '600',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: isTablet ? 14 : 12,
        paddingHorizontal: theme.SIZES.BASE,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        height: verticalScale(50),
    },
    googleButtonText: {
        marginLeft: theme.SIZES.BASE,
        fontWeight: '600',
    },
});

export default Login;
