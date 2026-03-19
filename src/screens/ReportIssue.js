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
import { useTranslation } from 'react-i18next';

import { useAlert, useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';

export default function ReportIssue({ navigation, route }) {
    const { t } = useTranslation();
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
            showAlert(t('reportIssue.validation.missingSubjectTitle'), t('reportIssue.validation.missingSubjectMessage'));
            return;
        }

        if (subject.trim().length < 3) {
            showAlert(t('reportIssue.validation.invalidSubjectTitle'), t('reportIssue.validation.invalidSubjectMessage'));
            return;
        }

        if (!description.trim()) {
            showAlert(t('reportIssue.validation.missingDescriptionTitle'), t('reportIssue.validation.missingDescriptionMessage'));
            return;
        }

        if (description.trim().length < 10) {
            showAlert(t('reportIssue.validation.invalidDescriptionTitle'), t('reportIssue.validation.invalidDescriptionMessage'));
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
                    t('reportIssue.success.title'),
                    `${t('reportIssue.success.message')}${result.githubIssueNumber ? ` (#${result.githubIssueNumber})` : ''}.`,
                    [
                        {
                            text: t('reportIssue.success.ok'),
                            onPress: () => navigation.goBack(),
                        },
                    ],
                );
            }
        } catch (error) {
            console.error('Error submitting issue:', error);
            showAlert(
                t('reportIssue.error.title'),
                t('reportIssue.error.message'),
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
                                        {gameSnapshot ? t('reportIssue.bugReportTitle') : t('reportIssue.feedbackTitle')}
                                    </Text>
                                    <Text size={14} color={colors.TEXT_SECONDARY}>
                                        {gameSnapshot
                                            ? t('reportIssue.bugReportDescription')
                                            : t('reportIssue.feedbackDescription')}
                                    </Text>
                                </View>
                            </View>

                    {/* Subject Input */}
                    <Block style={styles.section}>
                        <Text size={16} bold color={colors.TEXT} style={styles.label}>
                            {t('reportIssue.subject')}
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
                            placeholder={t('reportIssue.subjectPlaceholder')}
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
                            {t('reportIssue.description')}
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
                            placeholder={t('reportIssue.descriptionPlaceholder')}
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
                                    {t('reportIssue.gameStateIncluded')}
                                </Text>
                                <Text size={12} color={colors.TEXT_SECONDARY} style={{ marginTop: 4 }}>
                                    {t('reportIssue.turn')}: {gameSnapshot.turn === 'w' ? t('reportIssue.white') : t('reportIssue.black')}
                                    {gameSnapshot.isGameOver && ` • ${t('reportIssue.gameOver')}`}
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
                                    {t('reportIssue.submitIssue')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Block>

                            {/* Footer Note */}
                            {!user && (
                                <Block style={styles.section}>
                                    <Text size={12} color={colors.TEXT_SECONDARY} center>
                                        {t('reportIssue.anonymousNote')}
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

