import { Block, Text, theme } from 'galio-framework';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts';
import { getScenario } from '../constants/tutorialScenarios';

const { width, height } = Dimensions.get('screen');

// Clickable text component for scenario links
const ScenarioLink = ({ children, scenarioId, navigation, color }) => {
    const handlePress = () => {
        const scenario = getScenario(scenarioId);
        if (scenario) {
            navigation.navigate('ScenarioBoard', { scenario });
        }
    };

    return (
        <Text bold style={[styles.link, { color: color }]} onPress={handlePress}>
            {children}
        </Text>
    );
};

export default function HowToPlay({ navigation }) {
    const { colors } = useTheme();

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
                            <ScenarioLink
                                scenarioId='checkmate'
                                navigation={navigation}
                                color={colors.LINK}
                            >
                                Checkmate
                            </ScenarioLink>{' '}
                            your opponent's Whale (when the Whale is in{' '}
                            <ScenarioLink
                                scenarioId='check'
                                navigation={navigation}
                                color={colors.LINK}
                            >
                                check
                            </ScenarioLink>{' '}
                            and cannot escape)
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • Control the <Text bold>most area with Coral</Text> when:
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
                            <ScenarioLink
                                scenarioId='hunterEffect'
                                navigation={navigation}
                                color={colors.LINK}
                            >
                                Hunter
                            </ScenarioLink>{' '}
                            pieces (without four coral icons) can remove Coral
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <ScenarioLink
                                scenarioId='gathererEffect'
                                navigation={navigation}
                                color={colors.LINK}
                            >
                                Gatherer
                            </ScenarioLink>{' '}
                            pieces (with four coral icons) can place Coral
                        </Text>
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
                            • <Text bold>Hunter pieces</Text> (without coral icons) get{' '}
                            <Text bold>STOPPED BY</Text> Coral - they cannot move through it
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • <Text bold>Gatherer pieces</Text> (with four coral icons) are more
                            powerful - they can pass <Text bold>THROUGH</Text> Coral freely
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.ruleSection, { marginTop: theme.SIZES.BASE }]}
                        onPress={() => {
                            const scenario = getScenario('coralMovementComparison');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.ruleTitle, { color: colors.LINK }]}>
                            <Text bold>🪸 See Coral Movement Demo</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Tap to see how Hunter pieces are blocked by Coral while Gatherer pieces
                            can pass through it.
                        </Text>
                    </TouchableOpacity>

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

                    <TouchableOpacity
                        style={styles.pieceSection}
                        onPress={() => {
                            const scenario = getScenario('whaleMovement');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pieceTitle, { color: colors.LINK }]}>
                            🐋 <Text bold>Whale (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Can move half the piece any number of squares in any direction, or
                            rotate half of the piece to an adjacent square. Cannot end movement in
                            check.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.pieceSection}
                        onPress={() => {
                            const scenario = getScenario('dolphinMovement');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pieceTitle, { color: colors.LINK }]}>
                            🐬 <Text bold>Dolphin (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves any number of squares vertically, horizontally, or diagonally.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.pieceSection}
                        onPress={() => {
                            const scenario = getScenario('turtleMovement');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pieceTitle, { color: colors.LINK }]}>
                            🐢 <Text bold>Turtle (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves any number of squares vertically or horizontally.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.pieceSection}
                        onPress={() => {
                            const scenario = getScenario('pufferfishMovement');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pieceTitle, { color: colors.LINK }]}>
                            🐡 <Text bold>Pufferfish (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves any number of squares diagonally.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.pieceSection}
                        onPress={() => {
                            const scenario = getScenario('octopusMovement');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pieceTitle, { color: colors.LINK }]}>
                            🐙 <Text bold>Octopus (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves one square diagonally.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.pieceSection}
                        onPress={() => {
                            const scenario = getScenario('crabMovement');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pieceTitle, { color: colors.LINK }]}>
                            🦀 <Text bold>Crab (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Moves one square vertically or horizontally.
                        </Text>
                    </TouchableOpacity>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Special Rules
                    </Text>

                    <TouchableOpacity
                        style={styles.ruleSection}
                        onPress={() => {
                            const scenario = getScenario('capture');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.ruleTitle, { color: colors.LINK }]}>
                            <Text bold>Capture (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Move to a square occupied by an enemy piece. Whales can capture two
                            pieces in one move.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.ruleSection}
                        onPress={() => {
                            const scenario = getScenario('hunterEffect');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.ruleTitle, { color: colors.LINK }]}>
                            <Text bold>Hunter Effect (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Hunter pieces (without coral icons) stop when moving onto Coral and can
                            remove it from the board.
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.ruleSection}
                        onPress={() => {
                            const scenario = getScenario('gathererEffect');
                            if (scenario) navigation.navigate('ScenarioBoard', { scenario });
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.ruleTitle, { color: colors.LINK }]}>
                            <Text bold>Gatherer Effect (tap to see demo)</Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Gatherer pieces (with four coral icons) can place Coral on empty squares
                            they move to.
                        </Text>
                    </TouchableOpacity>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        Draw & Resignation
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • <Text bold>Stalemate:</Text> When a player has no legal moves and
                            their Whale is not in check
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • <Text bold>Threefold repetition:</Text> Same position occurs three
                            times with the same player to move
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • <Text bold>Resignation:</Text> A player may resign at any time
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
    },
    heading: {
        marginBottom: theme.SIZES.BASE,
    },
    subHeading: {
        marginBottom: theme.SIZES.BASE,
        fontSize: 18,
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: theme.SIZES.BASE,
    },
    bulletSection: {
        marginLeft: theme.SIZES.BASE,
        marginTop: theme.SIZES.BASE / 2,
    },
    bulletPoint: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: theme.SIZES.BASE / 2,
    },
    subBulletSection: {
        marginLeft: theme.SIZES.BASE * 2,
        marginTop: theme.SIZES.BASE / 2,
    },
    subBullet: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: theme.SIZES.BASE / 2,
    },
    pieceSection: {
        marginBottom: theme.SIZES.BASE * 1.5,
    },
    pieceTitle: {
        fontSize: 16,
        marginBottom: theme.SIZES.BASE / 2,
    },
    ruleSection: {
        marginBottom: theme.SIZES.BASE * 1.5,
    },
    ruleTitle: {
        fontSize: 16,
        marginBottom: theme.SIZES.BASE / 2,
    },
    link: {
        textDecorationLine: 'underline',
    },
});
