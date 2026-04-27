import { Block, Text, theme } from 'galio-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { Avatar, Icon, LoadingScreen, TimeControlModal } from '../components';
import { useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions, useGame } from '../hooks';

export default function Leaderboard() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { getLeaderboard } = useFirebaseFunctions();
    const { sendGameRequest, sendingGameRequest } = useGame();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [neighborhood, setNeighborhood] = useState([]);
    const [userRank, setUserRank] = useState(null);

    const [timeControlModalVisible, setTimeControlModalVisible] = useState(false);
    const [pendingGameRequest, setPendingGameRequest] = useState(null);
    const [sendingGameToUserId, setSendingGameToUserId] = useState(null);

    const handleStartGame = async (userId, displayName) => {
        setPendingGameRequest({ userId, displayName });
        setTimeControlModalVisible(true);
    };

    const handleTimeControlSelect = async (timeControl) => {
        setTimeControlModalVisible(false);
        if (pendingGameRequest) {
            setSendingGameToUserId(pendingGameRequest.userId);
            try {
                await sendGameRequest(
                    pendingGameRequest.userId,
                    pendingGameRequest.displayName,
                    timeControl,
                );
            } finally {
                setSendingGameToUserId(null);
                setPendingGameRequest(null);
            }
        }
    };

    const handleTimeControlCancel = () => {
        setTimeControlModalVisible(false);
        setPendingGameRequest(null);
    };

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
        const isSendingGame = sendingGameToUserId === item.id;
        const isDisabled = isMe || sendingGameRequest;
        
        return (
            <TouchableOpacity
                onPress={() => handleStartGame(item.id, item.displayName)}
                disabled={isDisabled}
                activeOpacity={0.7}
            >
                <Block
                    row
                    middle
                    style={[
                        styles.playerRow,
                        {
                            backgroundColor: isMe ? colors.PRIMARY + '15' : colors.CARD_BACKGROUND,
                            borderColor: isMe ? colors.PRIMARY : colors.BORDER_COLOR,
                            borderWidth: isMe ? 2 : 1,
                            opacity: (isSendingGame || (isDisabled && !isMe)) ? 0.6 : 1,
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
                        elo={item.elo}
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
                    
                    {!isMe && (
                        <Block style={styles.actionContainer}>
                            {isSendingGame ? (
                                <ActivityIndicator size="small" color={colors.PRIMARY} />
                            ) : (
                                <Icon
                                    name='gamepad'
                                    family='font-awesome'
                                    size={18}
                                    color={colors.PRIMARY}
                                />
                            )}
                        </Block>
                    )}
                </Block>
            </TouchableOpacity>
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

            <TimeControlModal
                visible={timeControlModalVisible}
                onSelect={handleTimeControlSelect}
                onCancel={handleTimeControlCancel}
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
    actionContainer: {
        width: scale(30),
        alignItems: 'center',
        justifyContent: 'center',
    },
});
