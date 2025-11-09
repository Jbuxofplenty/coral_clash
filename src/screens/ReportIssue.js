import { LinearGradient } from 'expo-linear-gradient';
import { Block, Icon, Text } from 'galio-framework';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useAlert, useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';

export default function ReportIssue({ navigation, route }) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const { submitIssue } = useFirebaseFunctions();

    // Get game snapshot from navigation params if provided
    const gameSnapshot = route?.params?.gameSnapshot || null;

    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        // Dismiss keyboard first
        Keyboard.dismiss();

        // Validate inputs
        if (!subject.trim()) {
            showAlert('Missing Information', 'Please enter a subject for your issue.');
            return;
        }

        if (subject.trim().length < 3) {
            showAlert('Invalid Subject', 'Subject must be at least 3 characters long.');
            return;
        }

        if (!description.trim()) {
            showAlert('Missing Information', 'Please enter a description for your issue.');
            return;
        }

        if (description.trim().length < 10) {
            showAlert('Invalid Description', 'Description must be at least 10 characters long.');
            return;
        }

        try {
            setSubmitting(true);

            const result = await submitIssue({
                subject: subject.trim(),
                description: description.trim(),
                gameSnapshot,
            });

            if (result.success) {
                showAlert(
                    'Issue Submitted',
                    `Thank you for your feedback! Your issue has been submitted${result.githubIssueNumber ? ` (#${result.githubIssueNumber})` : ''}.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => navigation.goBack(),
                        },
                    ],
                );
            }
        } catch (error) {
            console.error('Error submitting issue:', error);
            showAlert(
                'Submission Failed',
                'Failed to submit your issue. Please check your connection and try again.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10;

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps='handled'
                enableOnAndroid={true}
                enableAutomaticScroll={true}
                extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
                extraHeight={Platform.OS === 'ios' ? 120 : 140}
            >
                        {/* Card Container */}
                        <Block
                            style={[
                                styles.card,
                                { backgroundColor: colors.CARD_BACKGROUND },
                            ]}
                        >
                            {/* Info Banner */}
                            <View style={styles.infoBanner}>
                                <View style={styles.infoBannerIcon}>
                                    <Icon
                                        name={gameSnapshot ? 'bug-report' : 'feedback'}
                                        family='MaterialIcons'
                                        size={28}
                                        color={colors.PRIMARY}
                                    />
                                </View>
                                <View style={styles.infoBannerContent}>
                                    <Text size={16} bold color={colors.TEXT} style={{ marginBottom: 4 }}>
                                        {gameSnapshot ? 'Bug Report' : 'Feedback & Issues'}
                                    </Text>
                                    <Text size={14} color={colors.TEXT_SECONDARY}>
                                        {gameSnapshot
                                            ? 'Report a bug with the current game state. The game position will be included in your report.'
                                            : 'Submit feedback or report an issue. We appreciate your input!'}
                                    </Text>
                                </View>
                            </View>

                    {/* Subject Input */}
                    <Block style={styles.section}>
                        <Text size={16} bold color={colors.TEXT} style={styles.label}>
                            Subject
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.CARD_BACKGROUND,
                                    color: colors.TEXT,
                                    borderColor: colors.BORDER_COLOR,
                                },
                            ]}
                            placeholder='Brief summary of the issue'
                            placeholderTextColor={colors.TEXT_SECONDARY}
                            value={subject}
                            onChangeText={setSubject}
                            maxLength={200}
                            editable={!submitting}
                            returnKeyType='next'
                            blurOnSubmit={false}
                        />
                        <Text
                            size={12}
                            color={colors.TEXT_SECONDARY}
                            style={styles.characterCount}
                        >
                            {subject.length}/200
                        </Text>
                    </Block>

                    {/* Description Input */}
                    <Block style={styles.section}>
                        <Text size={16} bold color={colors.TEXT} style={styles.label}>
                            Description
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                {
                                    backgroundColor: colors.CARD_BACKGROUND,
                                    color: colors.TEXT,
                                    borderColor: colors.BORDER_COLOR,
                                },
                            ]}
                            placeholder='Detailed description of the issue or feedback...'
                            placeholderTextColor={colors.TEXT_SECONDARY}
                            value={description}
                            onChangeText={setDescription}
                            maxLength={5000}
                            multiline
                            numberOfLines={8}
                            textAlignVertical='top'
                            editable={!submitting}
                            returnKeyType='done'
                            blurOnSubmit={true}
                        />
                        <Text
                            size={12}
                            color={colors.TEXT_SECONDARY}
                            style={styles.characterCount}
                        >
                            {description.length}/5000
                        </Text>
                    </Block>

                    {/* Game State Indicator */}
                    {gameSnapshot && (
                        <Block style={styles.section}>
                            <Block
                                style={[
                                    styles.gameStateIndicator,
                                    { backgroundColor: colors.CARD_BACKGROUND },
                                ]}
                            >
                                <Text size={14} color={colors.TEXT}>
                                    ✓ Game state will be included
                                </Text>
                                <Text size={12} color={colors.TEXT_SECONDARY} style={{ marginTop: 4 }}>
                                    Turn: {gameSnapshot.turn === 'w' ? 'White' : 'Black'}
                                    {gameSnapshot.isGameOver && ' • Game Over'}
                                </Text>
                            </Block>
                        </Block>
                    )}

                    {/* Submit Button */}
                    <Block style={styles.section}>
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                {
                                    backgroundColor: canSubmit && !submitting ? colors.PRIMARY : colors.MUTED,
                                },
                            ]}
                            onPress={handleSubmit}
                            disabled={!canSubmit || submitting}
                            activeOpacity={0.8}
                        >
                            {submitting ? (
                                <ActivityIndicator size='small' color='#fff' />
                            ) : (
                                <Text bold size={16} color='#fff'>
                                    Submit Issue
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Block>

                            {/* Footer Note */}
                            {!user && (
                                <Block style={styles.section}>
                                    <Text size={12} color={colors.TEXT_SECONDARY} center>
                                        Note: You're submitting anonymously. Log in to track your issues.
                                    </Text>
                                </Block>
                            )}
                        </Block>
            </KeyboardAwareScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoBanner: {
        flexDirection: 'row',
        marginBottom: 24,
        alignItems: 'flex-start',
    },
    infoBannerIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    infoBannerContent: {
        flex: 1,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        minHeight: 150,
        paddingTop: 12,
    },
    characterCount: {
        marginTop: 4,
        textAlign: 'right',
    },
    gameStateIndicator: {
        padding: 12,
        borderRadius: 8,
    },
    submitButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
});

