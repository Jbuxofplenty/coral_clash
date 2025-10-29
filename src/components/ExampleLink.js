import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'galio-framework';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { getScenario } from '../constants/tutorialScenarios';
import { useTheme } from '../contexts';

const VIEWED_EXAMPLES_KEY = '@coral_clash_viewed_examples';

/**
 * Load viewed examples from AsyncStorage
 */
export const loadViewedExamples = async () => {
    try {
        const stored = await AsyncStorage.getItem(VIEWED_EXAMPLES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return [];
    } catch (error) {
        console.error('Error loading viewed examples:', error);
        return [];
    }
};

/**
 * Mark an example as viewed in AsyncStorage
 */
export const markExampleViewed = async (scenarioId, currentViewedExamples) => {
    try {
        const updated = [...new Set([...currentViewedExamples, scenarioId])];
        await AsyncStorage.setItem(VIEWED_EXAMPLES_KEY, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('Error saving viewed example:', error);
        return currentViewedExamples;
    }
};

/**
 * Example link component with checkmark tracking
 */
export default function ExampleLink({ scenarioId, label, navigation, viewedExamples, onViewed }) {
    const { colors } = useTheme();
    const isViewed = viewedExamples.includes(scenarioId);

    const handlePress = async () => {
        const scenario = getScenario(scenarioId);
        if (scenario) {
            navigation.navigate('ScenarioBoard', { scenario });
            if (!isViewed) {
                await onViewed(scenarioId);
            }
        }
    };

    return (
        <TouchableOpacity
            style={[styles.exampleLink, { borderColor: colors.PRIMARY }]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Text style={[styles.checkmark, { color: colors.PRIMARY }]}>
                {isViewed ? '✓' : '○'}
            </Text>
            <Text style={[styles.exampleLinkText, { color: colors.PRIMARY }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    exampleLink: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderWidth: 1.5,
        borderRadius: 8,
        marginBottom: 6,
    },
    checkmark: {
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 12,
    },
    exampleLinkText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
