import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Block, Button, Input, Text, theme } from 'galio-framework';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { moderateScale } from 'react-native-size-matters';

import { useAuth, useTheme } from '../contexts';

const { width, height } = Dimensions.get('screen');

function Login({ navigation }) {
    const {
        user,
        signIn,
        signUp,
        signInWithGoogle,
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

    // Refs for input fields
    const displayNameRef = React.useRef(null);
    const emailRef = React.useRef(null);
    const passwordRef = React.useRef(null);

    // Redirect to Home if user is already logged in
    React.useEffect(() => {
        if (user) {
            navigation.navigate('Home');
        }
    }, [user, navigation]);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (isSignUp) {
            const trimmedDisplayName = displayName?.trim();

            if (!trimmedDisplayName) {
                setError('Username is required');
                return;
            }

            if (trimmedDisplayName.length < 2) {
                setError('Username must be at least 2 characters');
                return;
            }

            if (trimmedDisplayName.length > 30) {
                setError('Username must be less than 30 characters');
                return;
            }

            // Check for valid characters (alphanumeric, spaces, underscores, hyphens)
            if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedDisplayName)) {
                setError(
                    'Username can only contain letters, numbers, spaces, underscores, and hyphens',
                );
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
            setError(err.message || 'Authentication failed');
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
            setError(err.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            await resetPassword(email);
            setSuccessMessage('Password reset email sent! Check your inbox.');
            setShowForgotPassword(false);
        } catch (err) {
            setError(err.message || 'Failed to send reset email');
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps='handled'
                >
                    <Block flex center middle style={styles.container}>
                        <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                            <Text
                                size={moderateScale(32)}
                                bold
                                color={colors.PRIMARY}
                                style={styles.title}
                            >
                                {showForgotPassword
                                    ? 'Reset Password'
                                    : isSignUp
                                      ? 'Create Account'
                                      : 'Welcome Back'}
                            </Text>
                            <Block style={styles.subtitleContainer}>
                                <Text
                                    size={moderateScale(16)}
                                    color={colors.TEXT_SECONDARY}
                                    style={styles.subtitle}
                                >
                                    {showForgotPassword
                                        ? 'Enter your email to receive a password reset link'
                                        : isSignUp
                                          ? 'Create an account to play online. Choose a unique username!'
                                          : 'Sign in to play against the computer or challenge other players online'}
                                </Text>
                            </Block>

                            {error || authError ? (
                                <Block style={styles.errorContainer}>
                                    <Text size={moderateScale(14)} color={colors.ERROR} center>
                                        {error || authError}
                                    </Text>
                                </Block>
                            ) : null}

                            {successMessage ? (
                                <Block style={styles.successContainer}>
                                    <Text size={moderateScale(14)} color={colors.SUCCESS} center>
                                        {successMessage}
                                    </Text>
                                </Block>
                            ) : null}

                            <Block style={styles.form}>
                                {!showForgotPassword && (
                                    <>
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
                                                size={24}
                                                color='#DB4437'
                                            />
                                            <Text
                                                size={moderateScale(16)}
                                                color={colors.TEXT}
                                                style={styles.googleButtonText}
                                            >
                                                {isSignUp
                                                    ? 'Sign up with Google'
                                                    : 'Sign in with Google'}
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
                                                size={moderateScale(14)}
                                                color={colors.TEXT_SECONDARY}
                                                style={styles.dividerText}
                                            >
                                                OR
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
                                        placeholder='Username (required)'
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
                                    placeholder='Email'
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
                                        placeholder='Password'
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
                                    onPress={
                                        showForgotPassword ? handleForgotPassword : handleSubmit
                                    }
                                    disabled={loading || authLoading}
                                >
                                    {loading || authLoading ? (
                                        <ActivityIndicator color='#fff' />
                                    ) : (
                                        <Text bold size={moderateScale(16)} color='#fff'>
                                            {showForgotPassword
                                                ? 'Send Reset Link'
                                                : isSignUp
                                                  ? 'Sign Up'
                                                  : 'Sign In'}
                                        </Text>
                                    )}
                                </Button>

                                {!showForgotPassword && !isSignUp && (
                                    <TouchableOpacity
                                        onPress={toggleForgotPassword}
                                        style={styles.forgotPasswordButton}
                                    >
                                        <Text
                                            size={moderateScale(14)}
                                            color={colors.PRIMARY}
                                            center
                                        >
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    onPress={showForgotPassword ? toggleForgotPassword : toggleMode}
                                    style={styles.toggleButton}
                                >
                                    <Text size={moderateScale(14)} color={colors.PRIMARY} center>
                                        {showForgotPassword
                                            ? 'Back to Sign In'
                                            : isSignUp
                                              ? 'Already have an account? Sign In'
                                              : "Don't have an account? Sign Up"}
                                    </Text>
                                </TouchableOpacity>
                            </Block>
                        </Block>
                    </Block>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: width,
        height: height,
    },
    keyboardView: {
        flex: 1,
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
        padding: width > 600 ? theme.SIZES.BASE * 2.5 : theme.SIZES.BASE * 1.5,
        paddingVertical: width > 600 ? theme.SIZES.BASE * 3 : theme.SIZES.BASE * 3,
        width: '100%',
        maxWidth: width > 600 ? Math.min(600, width * 0.6) : 400,
        shadowColor: theme.COLORS.BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        shadowOpacity: 0.3,
        elevation: 8,
    },
    title: {
        marginBottom: width > 600 ? theme.SIZES.BASE * 1.5 : theme.SIZES.BASE,
        textAlign: 'center',
    },
    subtitleContainer: {
        marginBottom: width > 600 ? theme.SIZES.BASE * 2.5 : theme.SIZES.BASE * 2,
        paddingHorizontal: width > 600 ? theme.SIZES.BASE : 0,
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
        height: width > 600 ? 100 : 48,
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
        marginVertical: width > 600 ? theme.SIZES.BASE * 1.5 : theme.SIZES.BASE * 2,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: theme.SIZES.BASE,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: width > 600 ? 10 : 12,
        paddingHorizontal: theme.SIZES.BASE,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    googleButtonText: {
        marginLeft: theme.SIZES.BASE,
        fontWeight: '600',
    },
});

export default Login;
