import { LinearGradient } from 'expo-linear-gradient';
import { Block, Text, theme } from 'galio-framework';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import ExampleLink, { loadViewedExamples, markExampleViewed } from '../components/ExampleLink';
import { useTheme } from '../contexts';
import { logTutorialStep } from '../utils/analyticsEvents';

const { width, height } = Dimensions.get('screen');

export default function HowToPlay({ navigation }) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [viewedExamples, setViewedExamples] = useState([]);

    // ── Tutorial funnel tracking ──────────────────────────────────────
    // Tracks which scroll-based steps have already been logged (fire-once per session)
    const loggedStepsRef = useRef(new Set());
    // Records the Y offset of each section card for scroll detection
    const sectionOffsetsRef = useRef({});
    // Tracks whether the first example tap has been logged this session
    const firstExampleTappedRef = useRef(false);
    // ScrollView layout height (viewport)
    const scrollViewHeightRef = useRef(0);

    // Map section keys to step numbers and step names
    const SECTION_STEP_MAP = {
        setup:         { step: 2, name: 'how_to_play_scroll_setup' },
        turnOverview:  { step: 3, name: 'how_to_play_scroll_turn_overview' },
        movement:      { step: 4, name: 'how_to_play_scroll_movement' },
        specialRules:  { step: 5, name: 'how_to_play_scroll_special_rules' },
        draw:          { step: 6, name: 'how_to_play_scroll_draw' },
    };

    // Log step 1 (begin) on mount
    useEffect(() => {
        logTutorialStep(1, 'how_to_play_begin', 'how_to_play');
    }, []);

    // Record section Y offset via onLayout
    const handleSectionLayout = useCallback((sectionKey, event) => {
        const { y } = event.nativeEvent.layout;
        sectionOffsetsRef.current[sectionKey] = y;
    }, []);

    // Check which sections are visible on scroll
    const handleScroll = useCallback((event) => {
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
        const scrollY = contentOffset.y;
        const viewportHeight = layoutMeasurement.height;
        scrollViewHeightRef.current = viewportHeight;

        // Check each section: consider "visible" when its top is within the viewport
        for (const [sectionKey, { step, name }] of Object.entries(SECTION_STEP_MAP)) {
            if (loggedStepsRef.current.has(step)) continue;
            const sectionY = sectionOffsetsRef.current[sectionKey];
            if (sectionY !== undefined && scrollY + viewportHeight >= sectionY + 50) {
                loggedStepsRef.current.add(step);
                logTutorialStep(step, name, 'how_to_play');
            }
        }

        // Step 8: scroll-to-bottom detection (within 20px of the bottom)
        if (!loggedStepsRef.current.has(8)) {
            const isAtBottom = scrollY + viewportHeight >= contentSize.height - 20;
            if (isAtBottom) {
                loggedStepsRef.current.add(8);
                logTutorialStep(8, 'how_to_play_complete', 'how_to_play');
            }
        }
    }, []);
    // ── End tutorial funnel tracking ──────────────────────────────────

    useEffect(() => {
        loadExamples();
    }, []);

    const loadExamples = async () => {
        const examples = await loadViewedExamples();
        setViewedExamples(examples);
    };

    const handleMarkViewed = async (scenarioId) => {
        // Track first example tap for tutorial funnel (step 7)
        if (!firstExampleTappedRef.current) {
            firstExampleTappedRef.current = true;
            logTutorialStep(7, 'how_to_play_first_example', 'how_to_play');
        }

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
                onScroll={handleScroll}
                scrollEventThrottle={200}
            >
                <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {t('howToPlay.objective.title')}
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {t('howToPlay.objective.intro')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.objective.checkmate')}
                            </Text>{' '}
                            {t('howToPlay.objective.checkmateDesc')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.objective.check')}
                            </Text>{' '}
                            {t('howToPlay.objective.checkmateDescEnd')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • {t('howToPlay.objective.coralControlDesc')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.objective.coralControl')}
                            </Text>{' '}
                            {t('howToPlay.objective.coralControlWhen')}
                        </Text>
                        <View style={styles.subBulletSection}>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - {t('howToPlay.objective.coralPlaced')}
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - {t('howToPlay.objective.whaleRemaining')}
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                - {t('howToPlay.objective.backRowReached')}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={[styles.text, { color: colors.TEXT, marginTop: theme.SIZES.BASE }]}
                    >
                        <Text bold style={{ color: colors.TEXT }}>
                            {t('howToPlay.objective.areaControlled')}
                        </Text>{' '}
                        {t('howToPlay.objective.areaControlledDesc')}
                    </Text>

                    <View style={styles.examplesContainer}>
                        <ExampleLink
                            scenarioId='checkmate'
                            label={t('howToPlay.objective.checkmateExample')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='check'
                            label={t('howToPlay.objective.checkExample')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='coralVictory'
                            label={t('howToPlay.objective.coralVictoryExample')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block
                    style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}
                    onLayout={(e) => handleSectionLayout('setup', e)}
                >
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {t('howToPlay.setup.title')}
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {t('howToPlay.setup.boardDesc')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • {t('howToPlay.setup.coralPieces')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            • {t('howToPlay.setup.units')}
                        </Text>
                    </View>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {t('howToPlay.setup.variants')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.setup.hunter')}
                            </Text>{' '}
                            {t('howToPlay.setup.hunterDesc')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.setup.gatherer')}
                            </Text>{' '}
                            {t('howToPlay.setup.gathererDesc')}
                        </Text>
                    </View>
                    <View style={styles.examplesContainer}>
                        <ExampleLink
                            scenarioId='hunterEffect'
                            label={t('howToPlay.setup.hunterExample')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                        <ExampleLink
                            scenarioId='gathererEffect'
                            label={t('howToPlay.setup.gathererExample')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block
                    style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}
                    onLayout={(e) => handleSectionLayout('turnOverview', e)}
                >
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {t('howToPlay.turnOverview.title')}
                    </Text>
                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {t('howToPlay.turnOverview.intro')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            1. {t('howToPlay.turnOverview.step1')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            2. {t('howToPlay.turnOverview.step2')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            3. {t('howToPlay.turnOverview.step3')}
                        </Text>
                    </View>
                </Block>

                <Block
                    style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}
                    onLayout={(e) => handleSectionLayout('movement', e)}
                >
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {t('howToPlay.movement.title')}
                    </Text>

                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        <Text bold style={{ color: colors.TEXT }}>
                            {t('howToPlay.movement.important')}
                        </Text>{' '}
                        {t('howToPlay.movement.importantDesc')}
                    </Text>

                    <Text style={[styles.text, { color: colors.TEXT }]}>
                        {t('howToPlay.movement.variants')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.movement.hunterPieces')}
                            </Text>{' '}
                            {t('howToPlay.movement.hunterMovement')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.movement.stoppedBy')}
                            </Text>{' '}
                            {t('howToPlay.movement.hunterMovementDesc')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.movement.gathererPieces')}
                            </Text>{' '}
                            {t('howToPlay.movement.gathererMovement')}{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.movement.through')}
                            </Text>{' '}
                            {t('howToPlay.movement.gathererMovementDesc')}
                        </Text>
                    </View>

                    <ExampleLink
                        scenarioId='coralMovementComparison'
                        label={t('howToPlay.movement.coralMovementExample')}
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
                        {t('howToPlay.movement.individualMovements')}
                    </Text>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐋{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.whale.name')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.pieces.whale.intro')}
                        </Text>

                        <View style={styles.subBulletSection}>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                <Text bold style={{ color: colors.TEXT }}>
                                    {t('howToPlay.pieces.whale.slidingMove')}
                                </Text>{' '}
                                {t('howToPlay.pieces.whale.slidingMoveDesc')}
                            </Text>
                            <Text style={[styles.subBullet, { color: colors.TEXT }]}>
                                <Text bold style={{ color: colors.TEXT }}>
                                    {t('howToPlay.pieces.whale.rotationMove')}
                                </Text>{' '}
                                {t('howToPlay.pieces.whale.rotationMoveDesc')}
                            </Text>
                        </View>

                        <Text
                            style={[
                                styles.text,
                                { color: colors.TEXT, marginTop: theme.SIZES.BASE },
                            ]}
                        >
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.whale.checkRules')}
                            </Text>{' '}
                            {t('howToPlay.pieces.whale.checkRulesDesc')}
                        </Text>

                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.whale.doubleCapture')}
                            </Text>{' '}
                            {t('howToPlay.pieces.whale.doubleCaptureDesc')}
                        </Text>

                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.whale.doubleCoralRemoval')}
                            </Text>{' '}
                            {t('howToPlay.pieces.whale.doubleCoralRemovalDesc')}
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
                                {t('howToPlay.pieces.whale.specialCase')}
                            </Text>
                            <Text style={[styles.text, { color: colors.TEXT, marginBottom: 0 }]}>
                                {t('howToPlay.pieces.whale.specialCaseDesc')}
                            </Text>
                        </View>

                        <View style={styles.examplesContainer}>
                            <ExampleLink
                                scenarioId='whaleMovement'
                                label={t('howToPlay.pieces.whale.basicMovement')}
                                navigation={navigation}
                                viewedExamples={viewedExamples}
                                onViewed={handleMarkViewed}
                            />
                            <ExampleLink
                                scenarioId='whaleRotation'
                                label={t('howToPlay.pieces.whale.rotationExample')}
                                navigation={navigation}
                                viewedExamples={viewedExamples}
                                onViewed={handleMarkViewed}
                            />
                            <ExampleLink
                                scenarioId='whaleCoralException'
                                label={t('howToPlay.pieces.whale.coralException')}
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
                                {t('howToPlay.pieces.dolphin.name')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.pieces.dolphin.movement')}
                        </Text>
                        <ExampleLink
                            scenarioId='dolphinMovement'
                            label={t('howToPlay.pieces.dolphin.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐢{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.turtle.name')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.pieces.turtle.movement')}
                        </Text>
                        <ExampleLink
                            scenarioId='turtleMovement'
                            label={t('howToPlay.pieces.turtle.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐡{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.pufferfish.name')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.pieces.pufferfish.movement')}
                        </Text>
                        <ExampleLink
                            scenarioId='pufferfishMovement'
                            label={t('howToPlay.pieces.pufferfish.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🐙{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.octopus.name')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.pieces.octopus.movement')}
                        </Text>
                        <ExampleLink
                            scenarioId='octopusMovement'
                            label={t('howToPlay.pieces.octopus.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.pieceSection}>
                        <Text style={[styles.pieceTitle, { color: colors.TEXT }]}>
                            🦀{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.pieces.crab.name')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.pieces.crab.movement')}
                        </Text>
                        <ExampleLink
                            scenarioId='crabMovement'
                            label={t('howToPlay.pieces.crab.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block
                    style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}
                    onLayout={(e) => handleSectionLayout('specialRules', e)}
                >
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {t('howToPlay.specialRules.title')}
                    </Text>

                    <View style={styles.ruleSection}>
                        <Text style={[styles.ruleTitle, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.specialRules.capture.title')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.specialRules.capture.desc')}
                        </Text>
                        <ExampleLink
                            scenarioId='capture'
                            label={t('howToPlay.specialRules.capture.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.ruleSection}>
                        <Text style={[styles.ruleTitle, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.specialRules.hunterEffect.title')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.specialRules.hunterEffect.desc')}
                        </Text>
                        <View style={styles.bulletSection}>
                            <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                                •{' '}
                                <Text bold style={{ color: colors.TEXT }}>
                                    {t('howToPlay.specialRules.hunterEffect.movementStops')}
                                </Text>{' '}
                                {t('howToPlay.specialRules.hunterEffect.movementStopsDesc')}
                            </Text>
                            <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                                •{' '}
                                <Text bold style={{ color: colors.TEXT }}>
                                    {t('howToPlay.specialRules.hunterEffect.canRemove')}
                                </Text>{' '}
                                {t('howToPlay.specialRules.hunterEffect.canRemoveDesc')}
                            </Text>
                        </View>
                        <ExampleLink
                            scenarioId='hunterEffect'
                            label={t('howToPlay.specialRules.hunterEffect.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>

                    <View style={styles.ruleSection}>
                        <Text style={[styles.ruleTitle, { color: colors.TEXT }]}>
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.specialRules.gathererEffect.title')}
                            </Text>
                        </Text>
                        <Text style={[styles.text, { color: colors.TEXT }]}>
                            {t('howToPlay.specialRules.gathererEffect.desc')}
                        </Text>
                        <ExampleLink
                            scenarioId='gathererEffect'
                            label={t('howToPlay.specialRules.gathererEffect.example')}
                            navigation={navigation}
                            viewedExamples={viewedExamples}
                            onViewed={handleMarkViewed}
                        />
                    </View>
                </Block>

                <Block
                    style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}
                    onLayout={(e) => handleSectionLayout('draw', e)}
                >
                    <Text h5 bold style={[styles.heading, { color: colors.PRIMARY }]}>
                        {t('howToPlay.drawResignation.title')}
                    </Text>
                    <View style={styles.bulletSection}>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.drawResignation.stalemate')}
                            </Text>{' '}
                            {t('howToPlay.drawResignation.stalemateDesc')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.drawResignation.threefoldRepetition')}
                            </Text>{' '}
                            {t('howToPlay.drawResignation.threefoldRepetitionDesc')}
                        </Text>
                        <Text style={[styles.bulletPoint, { color: colors.TEXT }]}>
                            •{' '}
                            <Text bold style={{ color: colors.TEXT }}>
                                {t('howToPlay.drawResignation.resignation')}
                            </Text>{' '}
                            {t('howToPlay.drawResignation.resignationDesc')}
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
