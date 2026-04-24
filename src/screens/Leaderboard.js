import { Block, Text, theme } from 'galio-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { Avatar, Icon, LoadingScreen } from '../components';
import { useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';

const { width } = Dimensions.get('screen');

export default function Leaderboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { colors } = useTheme();
    const { getLeaderboard } = useFirebaseFunctions();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [neighborhood, setNeighborhood] = useState([]);
    const [userRank, setUserRank] = useState(null);

    const loadLeaderboard = useCallback(async (isRefreshing = false) => {
        try {
            if (isRefreshing) setRefreshing(true);
            else setLoading(true);

            const result = await getLeaderboard();
            if (result.success) {
                setNeighborhood(result.neighborhood || []);
                setUserRank(result.userRank);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getLeaderboard]);

    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    const renderItem = ({ item }) => {
        const isMe = item.isCurrentUser;
        
        return (
            <Block
                row
                middle
                style={[
                    styles.playerRow,
                    {
                        backgroundColor: isMe ? colors.PRIMARY + '15' : colors.CARD_BACKGROUND,
                        borderColor: isMe ? colors.PRIMARY : colors.BORDER_COLOR,
                        borderWidth: isMe ? 2 : 1,
                    }
                ]}
            >
                <Block style={styles.rankContainer}>
                    <Text size={moderateScale(16)} bold color={isMe ? colors.PRIMARY : colors.TEXT_SECONDARY}>
                        #{item.rank}
                    </Text>
                </Block>

                <Avatar
                    avatarKey={item.avatarKey}
                    size="medium"
                    style={styles.avatar}
                />

                <Block style={styles.nameContainer}>
                    <Text size={moderateScale(16)} bold color={colors.TEXT} numberOfLines={1}>
                        {item.displayName}
                        {item.discriminator ? <Text color={colors.TEXT_SECONDARY} size={moderateScale(12)}> #{item.discriminator}</Text> : null}
                    </Text>
                    {isMe && (
                        <Text size={moderateScale(10)} color={colors.PRIMARY} bold uppercase>
                            {t('leaderboard.you')}
                        </Text>
                    )}
                </Block>

                <Block row middle style={styles.eloContainer}>
                    <Text size={moderateScale(18)} bold color={colors.TEXT} style={{ marginRight: 4 }}>
                        {item.elo}
                    </Text>
                    <Text size={moderateScale(10)} color={colors.TEXT_SECONDARY} uppercase>
                        ELO
                    </Text>
                </Block>
            </Block>
        );
    };

    if (loading) {
        return <LoadingScreen message={t('leaderboard.loading')} />;
    }

    return (
        <Block flex style={[styles.container, { backgroundColor: colors.GRADIENT_MID }]}>
            <Block style={styles.header}>
                <Icon name="trophy" family="font-awesome" size={moderateScale(40)} color={colors.WARNING} />
                <Text size={moderateScale(24)} bold color={colors.TEXT} style={{ marginTop: 8 }}>
                    {t('leaderboard.title')}
                </Text>
                <Text size={moderateScale(14)} color={colors.TEXT_SECONDARY}>
                    {t('leaderboard.subtitle')}
                </Text>
                {userRank && (
                    <Block style={[styles.rankBadge, { backgroundColor: colors.PRIMARY }]}>
                        <Text size={moderateScale(14)} bold color="white">
                            {t('leaderboard.yourRank', { rank: userRank })}
                        </Text>
                    </Block>
                )}
            </Block>

            <FlatList
                data={neighborhood}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={refreshing}
                onRefresh={() => loadLeaderboard(true)}
                ListEmptyComponent={
                    <Block center style={{ marginTop: 40 }}>
                        <Text color={colors.TEXT_SECONDARY}>{t('leaderboard.noPlayers')}</Text>
                    </Block>
                }
            />
        </Block>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: theme.SIZES.BASE,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    rankBadge: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    playerRow: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    rankContainer: {
        width: scale(45),
        alignItems: 'center',
    },
    avatar: {
        marginHorizontal: 12,
    },
    nameContainer: {
        flex: 1,
    },
    eloContainer: {
        width: scale(85),
        justifyContent: 'flex-end',
    },
});
