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
        console.log('🔵 User state changed:', user ? `User: ${user.email}` : 'No user');
        if (user) {
            console.log('🔵 Navigating to Home...');
            navigation.navigate('Home');
        }
    }, [user, navigation]);

    const handleSubmit = async () => {
        console.log('🔵 handleSubmit called', { isSignUp, email, hasPassword: !!password });

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (isSignUp && !displayName) {
            setError('Please enter a display name');
            return;
        }

        console.log('🔵 Starting auth...', isSignUp ? 'Sign Up' : 'Sign In');
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (isSignUp) {
                console.log('🔵 Calling signUp...');
                await signUp(email, password, displayName);
            } else {
                console.log('🔵 Calling signIn...');
                await signIn(email, password);
            }
            console.log('✅ Auth successful');
            // Navigation will be handled by auth state change
        } catch (err) {
            console.error('❌ Auth error:', err);
            setError(err.message || 'Authentication failed');
        } finally {
            console.log('🔵 Setting loading to false');
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
        <LinearGradient colors={['#1e3c72', '#2a5298', '#7e8ba3']} style={styles.gradient}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps='handled'
                >
                    <Block flex center middle style={styles.container}>
                        <Block style={styles.card}>
                            <Text h3 bold color='#1e3c72' style={styles.title}>
                                {showForgotPassword
                                    ? 'Reset Password'
                                    : isSignUp
                                      ? 'Create Account'
                                      : 'Welcome Back'}
                            </Text>
                            <Text
                                size={16}
                                color={materialTheme.COLORS.MUTED}
                                style={styles.subtitle}
                            >
                                {showForgotPassword
                                    ? 'Enter your email to receive a password reset link'
                                    : isSignUp
                                      ? 'Sign up to start playing Coral Clash online'
                                      : 'Sign in to play against the computer or challenge other players online'}
                            </Text>

                            {error || authError ? (
                                <Block style={styles.errorContainer}>
                                    <Text size={14} color='#ff0000' center>
                                        {error || authError}
                                    </Text>
                                </Block>
                            ) : null}

                            {successMessage ? (
                                <Block style={styles.successContainer}>
                                    <Text size={14} color='#28a745' center>
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
                                        style={styles.input}
                                        color='#333'
                                        placeholderTextColor='#999'
                                        autoCapitalize='words'
                                    />
                                )}
                                <Input
                                    placeholder='Email'
                                    value={email}
                                    onChangeText={setEmail}
                                    style={styles.input}
                                    color='#333'
                                    placeholderTextColor='#999'
                                    keyboardType='email-address'
                                    autoCapitalize='none'
                                />
                                {!showForgotPassword && (
                                    <Input
                                        placeholder='Password'
                                        value={password}
                                        onChangeText={setPassword}
                                        style={styles.input}
                                        color='#333'
                                        placeholderTextColor='#999'
                                        password
                                        viewPass
                                        autoCapitalize='none'
                                    />
                                )}

                                <Button
                                    color='#1e3c72'
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
                                        <Text size={14} color='#1e3c72' center>
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {!showForgotPassword && (
                                    <>
                                        <View style={styles.dividerContainer}>
                                            <View style={styles.divider} />
                                            <Text
                                                size={14}
                                                color={materialTheme.COLORS.MUTED}
                                                style={styles.dividerText}
                                            >
                                                OR
                                            </Text>
                                            <View style={styles.divider} />
                                        </View>

                                        <TouchableOpacity
                                            style={[
                                                styles.googleButton,
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
                                    <Text size={14} color={materialTheme.COLORS.MUTED} center>
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
        backgroundColor: '#e8e8e8',
    },
    dividerText: {
        marginHorizontal: theme.SIZES.BASE,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e8e8e8',
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
        color: '#333',
        fontWeight: '600',
    },
    googleButtonDisabled: {
        opacity: 0.5,
        backgroundColor: '#f5f5f5',
    },
    googleButtonTextDisabled: {
        color: '#999',
    },
});

export default Login;
