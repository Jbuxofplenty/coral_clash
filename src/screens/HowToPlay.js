import { LinearGradient } from 'expo-linear-gradient';
import { Block, Text, theme } from 'galio-framework';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import ExampleLink, { loadViewedExamples, markExampleViewed } from '../components/ExampleLink';
import { useTheme } from '../contexts';
import i18n from '../i18n';

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
                        {i18n.t('howToPlay.objective')}
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {i18n.t('howToPlay.objectiveDesc')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.checkmate')}
                            </Text>{' '}
                            {i18n.t('howToPlay.checkmateDesc')}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.check')}
                            </Text>{' '}
                            {i18n.t('howToPlay.checkmateDesc2')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • {i18n.t('howToPlay.control')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.mostArea')}
                            </Text>{' '}
                            {i18n.t('howToPlay.when')}
                        </Text>
                        <View style={styles.subBulletSection}>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - {i18n.t('howToPlay.condition1')}
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - {i18n.t('howToPlay.condition2')}
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - {i18n.t('howToPlay.condition3')}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={[styles.text, { color: colors.TEXT, marginTop: theme.SIZES.BASE }]}
                    >
                        <Text bold style={{ color: colors.TEXT }}>
                            {i18n.t('howToPlay.areaControlled')}
                        </Text>{' '}
                        {i18n.t('howToPlay.areaControlledDesc')}
                    </Text>

                    <View style={styles.examplesContainer}>
                        <ExampleLink
                            scenarioId='checkmate'
                            label={i18n.t('howToPlay.exCheckmate')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='check'
                            label={i18n.t('howToPlay.exCheck')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='coralVictory'
                            label={i18n.t('howToPlay.exCoralVictory')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {i18n.t('howToPlay.gameSetup')}
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {i18n.t('howToPlay.boardDesc')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • {i18n.t('howToPlay.setupCoral')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • {i18n.t('howToPlay.setupUnits')}
                        </Text>
                    </View>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {i18n.t('howToPlay.pieceTypes')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.hunter')}
                            </Text>{' '}
                            {i18n.t('howToPlay.hunterDesc')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.gatherer')}
                            </Text>{' '}
                            {i18n.t('howToPlay.gathererDesc')}
                        </Text>
                    </View>
                    <View style={styles.examplesContainer}>
                        <ExampleLink
                            scenarioId='hunterEffect'
                            label={i18n.t('howToPlay.exHunter')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='gathererEffect'
                            label={i18n.t('howToPlay.exGatherer')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {i18n.t('howToPlay.turnOverview')}
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {i18n.t('howToPlay.turnDesc')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.turnStep1')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.turnStep2')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.turnStep3')}
                        </Text>
                    </View>
                </Block>

                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {i18n.t('howToPlay.piecesMovement')}
                    </Text>

                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        <Text bold style={{ color: colors.TEXT }}>
                            {i18n.t('howToPlay.important')}
                        </Text>{' '}
                        {i18n.t('howToPlay.importantDesc')}
                    </Text>

                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {i18n.t('howToPlay.movementDesc')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.hunterPieces')}
                            </Text>{' '}
                            {i18n.t('howToPlay.hunterMove1')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.stoppedBy')}
                            </Text>{' '}
                            {i18n.t('howToPlay.hunterMove2')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.gathererPieces')}
                            </Text>{' '}
                            {i18n.t('howToPlay.gathererMove1')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.through')}
                            </Text>{' '}
                            {i18n.t('howToPlay.gathererMove2')}
                        </Text>
                    </View>

                    <ExampleLink
                        scenarioId='coralMovementComparison'
                        label={i18n.t('howToPlay.exCoralMovement')}
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
                        {i18n.t('howToPlay.individualMovements')}
                    </Text>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐋{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.whale')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.whaleDesc')}
                        </Text>

                        <View style={styles.subBulletSection}>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                <Text bold style={{ color: colors.TEXT }}>
                                    {i18n.t('howToPlay.slidingMove')}
                                </Text>{' '}
                                {i18n.t('howToPlay.slidingMoveDesc')}
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                <Text bold style={{ color: colors.TEXT }}>
                                    {i18n.t('howToPlay.rotationMove')}
                                </Text>{' '}
                                {i18n.t('howToPlay.rotationMoveDesc')}
                            </Text>
                        </View>

                        <Text
                            style={[
                                styles.text,
                                { color: colors.TEXT, marginTop: theme.SIZES.BASE },
                            ]}
                        >
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.checkRules')}
                            </Text>{' '}
                            {i18n.t('howToPlay.checkRulesDesc')}
                        </Text>

                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.doubleCapture')}
                            </Text>{' '}
                            {i18n.t('howToPlay.doubleCaptureDesc')}
                        </Text>

                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.doubleCoralRemoval')}
                            </Text>{' '}
                            {i18n.t('howToPlay.doubleCoralRemovalDesc')}
                        </Text>

                        <View
                            style={[
                                styles.specialCaseBox,
                                {
                                    backgroundColor: colors.PRIMARY + '10',
                                    borderColor: colors.PRIMARY,
                                },
                            ]}
                        >
                            <Text style={[styles.specialCaseTitle, { color: colors.PRIMARY }]}>
                                {i18n.t('howToPlay.specialCase')}
                            </Text>
                            <Text style={[styles.text, { color: colors.TEXT, marginBottom: 0 }]}>
                                {i18n.t('howToPlay.specialCaseDesc')}
                            </Text>
                        </View>

                        <View style={styles.examplesContainer}>
                            <ExampleLink
                                scenarioId='whaleMovement'
                                label={i18n.t('howToPlay.exWhale')}
                                navigation={navigation}
                                viewedExamples={viewedExamples}
                                onViewed={handleMarkViewed}
                            />
                            <ExampleLink
                                scenarioId='whaleRotation'
                                label={i18n.t('howToPlay.exWhaleRotation')}
                                navigation={navigation}
                                viewedExamples={viewedExamples}
                                onViewed={handleMarkViewed}
                            />
                            <ExampleLink
                                scenarioId='whaleCoralException'
                                label={i18n.t('howToPlay.exWhaleCoral')}
                                navigation={navigation}
                                viewedExamples={viewedExamples}
                                onViewed={handleMarkViewed}
                            />
                        </View>
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐬{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.dolphin')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.dolphinDesc')}
                        </Text>
                        <ExampleLink
                            scenarioId='dolphinMovement'
                            label={i18n.t('howToPlay.exDolphin')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐢{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.turtle')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.turtleDesc')}
                        </Text>
                        <ExampleLink
                            scenarioId='turtleMovement'
                            label={i18n.t('howToPlay.exTurtle')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐡{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {i18n.t('howToPlay.pufferfish')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {i18n.t('howToPlay.pufferfishDesc')}
                        </Text>
                        <ExampleLink
                            scenarioId='pufferfishMovement'
                            label={i18n.t('howToPlay.exPufferfish')}
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
                                Hunter Movement & Effect
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            Hunter pieces (without coral icons) have two important behaviors:
                        </Text>
                        <View style={styles.bulletSection}>
                            <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                                •{' '}
                                <Text bold style={{ color: colors.TEXT }}>
                                    Movement stops
                                </Text>{' '}
                                when landing on Coral
                            </Text>
                            <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                                •{' '}
                                <Text bold style={{ color: colors.TEXT }}>
                                    Can remove
                                </Text>{' '}
                                that Coral from the board
                            </Text>
                        </View>
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
    specialCaseBox: {
        borderWidth: 2,
        borderRadius: 8,
        padding: theme.SIZES.BASE * 1.5,
        marginVertical: theme.SIZES.BASE,
    },
    specialCaseTitle: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        marginBottom: theme.SIZES.BASE / 2,
    },
});
