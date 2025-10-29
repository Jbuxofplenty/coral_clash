import { LinearGradient } from 'expo-linear-gradient';
import { Block, Text, theme } from 'galio-framework';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import ExampleLink, { loadViewedExamples, markExampleViewed } from '../components/ExampleLink';
import { useTheme } from '../contexts';

const { width, height } = Dimensions.get('screen');

export default function HowToPlay({ navigation }) {
    const { colors } = useTheme();
    const [viewedExamples, setViewedExamples] = useState([]);

    useEffect(() => {
        loadExamples();
    }, []);

    const loadExamples = async () => {
        const examples = await loadViewedExamples();
        setViewedExamples(examples);
    };

    const handleMarkViewed = async (scenarioId) => {
        const updated = await markExampleViewed(scenarioId, viewedExamples);
        setViewedExamples(updated);
    };

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.gradient}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Objective
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        To win Coral Clash, complete one of these goals:
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Checkmate
                            </Text>{' '}
                            your opponent's Whale (when the Whale is in{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                check
                            </Text>{' '}
                            and cannot escape)
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • Control the{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                most area with Coral
                            </Text>{' '}
                            when:
                        </Text>
                        <View style={styles.subBulletSection}>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - A player has placed all their Coral
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - A player only has their Whale remaining
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - A Crab or Octopus reaches the opponent's back row
                            </Text>
                        </View>
                    </View>
                    <View style={styles.examplesContainer}>
                        <ExampleLink
                            scenarioId='checkmate'
                            label='Checkmate Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='check'
                            label='Check Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Game Setup
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        The board is an 8x8 grid with 64 squares. Each player has:
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • 17 Coral pieces
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • 17 units: 1 Whale, 2 Dolphins, 4 Turtles, 2 Pufferfish, 4 Crabs, and 4
                            Octopuses
                        </Text>
                    </View>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        Each piece type comes in two variants:
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Hunter
                            </Text>{' '}
                            pieces (without four coral icons) can remove Coral
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Gatherer
                            </Text>{' '}
                            pieces (with four coral icons) can place Coral
                        </Text>
                    </View>
                    <View style={styles.examplesContainer}>
                        <ExampleLink
                            scenarioId='hunterEffect'
                            label='Hunter Effect Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='gathererEffect'
                            label='Gatherer Effect Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Turn Overview
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        Yellow goes first, then players alternate. On your turn:
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            1. Move one of your pieces
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            2. Resolve any Capture, Hunter, or Gatherer effects
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            3. Check if any objectives have been met
                        </Text>
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        How Pieces Move
                    </Text>

                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        Each piece type comes in two variants that interact with Coral differently:
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Hunter pieces
                            </Text>{' '}
                            (without coral icons) get{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                STOPPED BY
                            </Text>{' '}
                            Coral - they cannot move through it
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Gatherer pieces
                            </Text>{' '}
                            (with four coral icons) are more powerful - they can pass{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                THROUGH
                            </Text>{' '}
                            Coral freely
                        </Text>
                    </View>

                    <ExampleLink
                        scenarioId='coralMovementComparison'
                        label='Coral Movement Example'
                        navigation={navigation}
                        viewedExamples={viewedExamples}
                        onViewed={handleMarkViewed}
                    />

                    <Text
                        h6
                        bold
                        style={[
                            styles.subHeading,
                            { color: colors.PRIMARY, marginTop: theme.SIZES.BASE * 2 },
                        ]}
                    >
                        Individual Piece Movements
                    </Text>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐋{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Whale
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Can move half the piece any number of squares in any direction, or
                            rotate half of the piece to an adjacent square. Cannot end movement in
                            check.
                        </Text>
                        <ExampleLink
                            scenarioId='whaleMovement'
                            label='Whale Movement Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐬{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Dolphin
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves any number of squares vertically, horizontally, or diagonally.
                        </Text>
                        <ExampleLink
                            scenarioId='dolphinMovement'
                            label='Dolphin Movement Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐢{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Turtle
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves any number of squares vertically or horizontally.
                        </Text>
                        <ExampleLink
                            scenarioId='turtleMovement'
                            label='Turtle Movement Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐡{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Pufferfish
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves any number of squares diagonally.
                        </Text>
                        <ExampleLink
                            scenarioId='pufferfishMovement'
                            label='Pufferfish Movement Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐙{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Octopus
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves one square diagonally.
                        </Text>
                        <ExampleLink
                            scenarioId='octopusMovement'
                            label='Octopus Movement Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🦀{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Crab
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves one square vertically or horizontally.
                        </Text>
                        <ExampleLink
                            scenarioId='crabMovement'
                            label='Crab Movement Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Special Rules
                    </Text>

                    <View style={styles.ruleSection}>
                        <Text style={[styles.ruleTitle, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                Capture
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Move to a square occupied by an enemy piece. Whales can capture two
                            pieces in one move.
                        </Text>
                        <ExampleLink
                            scenarioId='capture'
                            label='Capture Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.ruleSection}>
                        <Text style={[styles.ruleTitle, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                Hunter Effect
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Hunter pieces (without coral icons) stop when moving onto Coral and can
                            remove it from the board.
                        </Text>
                        <ExampleLink
                            scenarioId='hunterEffect'
                            label='Hunter Effect Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.ruleSection}>
                        <Text style={[styles.ruleTitle, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                Gatherer Effect
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Gatherer pieces (with four coral icons) can place Coral on empty squares
                            they move to.
                        </Text>
                        <ExampleLink
                            scenarioId='gathererEffect'
                            label='Gatherer Effect Example'
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Draw & Resignation
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Stalemate:
                            </Text>{' '}
                            When a player has no legal moves and their Whale is not in check
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Threefold repetition:
                            </Text>{' '}
                            Same position occurs three times with the same player to move
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                Resignation:
                            </Text>{' '}
                            A player may resign at any time
                        </Text>
                    </View>
                </Block>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: width,
        height: height,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE,
        paddingBottom: theme.SIZES.BASE * 3,
        alignItems: width > 600 ? 'center' : 'stretch',
    },
    card: {
        borderRadius: 12,
        padding: theme.SIZES.BASE * 2,
        marginBottom: theme.SIZES.BASE * 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
        width: width > 600 ? '100%' : 'auto',
        maxWidth: width > 600 ? 800 : undefined,
    },
    heading: {
        marginBottom: theme.SIZES.BASE,
    },
    subHeading: {
        marginBottom: theme.SIZES.BASE,
        fontSize: moderateScale(18),
    },
    text: {
        fontSize: moderateScale(15),
        lineHeight: moderateScale(22),
        marginBottom: theme.SIZES.BASE,
    },
    bulletSection: {
        marginLeft: theme.SIZES.BASE,
        marginTop: theme.SIZES.BASE / 2,
    },
    bulletPoint: {
        fontSize: moderateScale(15),
        lineHeight: moderateScale(22),
        marginBottom: theme.SIZES.BASE / 2,
    },
    subBulletSection: {
        marginLeft: theme.SIZES.BASE * 2,
        marginTop: theme.SIZES.BASE / 2,
    },
    subBullet: {
        fontSize: moderateScale(14),
        lineHeight: moderateScale(20),
        marginBottom: theme.SIZES.BASE / 2,
    },
    pieceSection: {
        marginBottom: theme.SIZES.BASE * 1.5,
    },
    pieceTitle: {
        fontSize: moderateScale(16),
        marginBottom: theme.SIZES.BASE / 2,
    },
    ruleSection: {
        marginBottom: theme.SIZES.BASE * 1.5,
    },
    ruleTitle: {
        fontSize: moderateScale(16),
        marginBottom: theme.SIZES.BASE / 2,
    },
    examplesContainer: {
        marginTop: theme.SIZES.BASE,
        gap: theme.SIZES.BASE / 2,
    },
});
