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
import { Ionicons } from '@expo/vector-icons';

import { materialTheme } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('screen');

function Login({ navigation }) {
    const {
        user,
        signIn,
        signUp,
        signInWithGoogle,
        googleSignInAvailable,
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

        if (isSignUp && !displayName) {
            setError('Please enter a display name');
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (isSignUp) {
                await signUp(email, password, displayName);
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
            await signInWithGoogle();
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
                            <Text h3 bold color={colors.PRIMARY} style={styles.title}>
                                {showForgotPassword
                                    ? 'Reset Password'
                                    : isSignUp
                                      ? 'Create Account'
                                      : 'Welcome Back'}
                            </Text>
                            <Text size={16} color={colors.TEXT_SECONDARY} style={styles.subtitle}>
                                {showForgotPassword
                                    ? 'Enter your email to receive a password reset link'
                                    : isSignUp
                                      ? 'Sign up to start playing Coral Clash online'
                                      : 'Sign in to play against the computer or challenge other players online'}
                            </Text>

                            {error || authError ? (
                                <Block style={styles.errorContainer}>
                                    <Text size={14} color={colors.ERROR} center>
                                        {error || authError}
                                    </Text>
                                </Block>
                            ) : null}

                            {successMessage ? (
                                <Block style={styles.successContainer}>
                                    <Text size={14} color={colors.SUCCESS} center>
                                        {successMessage}
                                    </Text>
                                </Block>
                            ) : null}

                            <Block style={styles.form}>
                                {!showForgotPassword && isSignUp && (
                                    <Input
                                        placeholder='Display Name'
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
                                    />
                                )}
                                <Input
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
                                />
                                {!showForgotPassword && (
                                    <Input
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
                                        <Text bold size={16} color='#fff'>
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
                                        <Text size={14} color={colors.PRIMARY} center>
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {!showForgotPassword && (
                                    <>
                                        <View style={styles.dividerContainer}>
                                            <View
                                                style={[
                                                    styles.divider,
                                                    { backgroundColor: colors.BORDER_COLOR },
                                                ]}
                                            />
                                            <Text
                                                size={14}
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

                                        <TouchableOpacity
                                            style={[
                                                styles.googleButton,
                                                {
                                                    backgroundColor: colors.CARD_BACKGROUND,
                                                    borderColor: colors.BORDER_COLOR,
                                                },
                                                !googleSignInAvailable &&
                                                    styles.googleButtonDisabled,
                                            ]}
                                            onPress={handleGoogleSignIn}
                                            disabled={
                                                !googleSignInAvailable || loading || authLoading
                                            }
                                        >
                                            <Ionicons
                                                name='logo-google'
                                                size={24}
                                                color={googleSignInAvailable ? '#DB4437' : '#ccc'}
                                            />
                                            <Text
                                                size={16}
                                                color={colors.TEXT}
                                                style={[
                                                    styles.googleButtonText,
                                                    !googleSignInAvailable &&
                                                        styles.googleButtonTextDisabled,
                                                ]}
                                            >
                                                {isSignUp
                                                    ? 'Sign up with Google'
                                                    : 'Sign in with Google'}
                                                {!googleSignInAvailable && ' (Production only)'}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <TouchableOpacity
                                    onPress={showForgotPassword ? toggleForgotPassword : toggleMode}
                                    style={styles.toggleButton}
                                >
                                    <Text size={14} color={colors.PRIMARY} center>
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
    },
    container: {
        width: width,
        paddingHorizontal: theme.SIZES.BASE * 2,
        paddingVertical: theme.SIZES.BASE * 4,
    },
    card: {
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
        height: 48,
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
        marginVertical: theme.SIZES.BASE * 2,
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
        paddingVertical: 12,
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
    googleButtonDisabled: {
        opacity: 0.5,
    },
    googleButtonTextDisabled: {
        opacity: 0.5,
    },
});

export default Login;
