import { Block, Text, theme } from 'galio-framework';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { ANDROID_STORE_URL, IOS_STORE_URL } from '../constants';
import { useTheme } from '../contexts';
import { deletePassAndPlayGame, getPassAndPlayGames } from '../utils/passAndPlayStorage';
import Avatar from './Avatar';
import Icon from './Icon';

const { width } = Dimensions.get('screen');
const isTablet = width >= 768;

/**
 * Card component that allows users to select a friend and start a game or play pass and play
 * @param {Array} friends - List of friends to display
 * @param {boolean} loading - Loading state for friends
 * @param {boolean} disabled - Whether the card is disabled
 * @param {Function} onSelectFriend - Callback when friend is selected (receives friendId, friendName)
 * @param {Function} onPassAndPlay - Callback when pass and play is selected
 */
export default function PlayWithFriendCard({
    friends,
    loading,
    disabled,
    onSelectFriend,
    onPassAndPlay,
    onResumePassAndPlay,
}) {
    const { colors } = useTheme();
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [friendModalVisible, setFriendModalVisible] = useState(false);
    const [passAndPlayModalVisible, setPassAndPlayModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [passAndPlayGames, setPassAndPlayGames] = useState([]);
    const [loadingPassAndPlay, setLoadingPassAndPlay] = useState(false);
    const [deletingGameId, setDeletingGameId] = useState(null);

    // Filter and sort friends based on search query
    const filteredFriends = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = query
            ? friends.filter((friend) => (friend.displayName || '').toLowerCase().includes(query))
            : friends;

        return [...filtered].sort((a, b) => {
            const nameA = (a.displayName || '').toLowerCase();
            const nameB = (b.displayName || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [friends, searchQuery]);

    // Sort pass and play games by most recent first
    const sortedPassAndPlayGames = useMemo(() => {
        return [...passAndPlayGames].sort((a, b) => {
            const aTime = new Date(a.updatedAt).getTime();
            const bTime = new Date(b.updatedAt).getTime();
            return bTime - aTime; // Newest first
        });
    }, [passAndPlayGames]);

    const handleCardPress = () => {
        if (disabled || loading) return;
        setOptionsModalVisible(true);
    };

    const handleInviteFriend = () => {
        setOptionsModalVisible(false);
        setFriendModalVisible(true);
        setSearchQuery(''); // Reset search when opening
    };

    const handleTextFriend = async () => {
        try {
            const message = `Let's play Coral Clash! 🦀\n\nDownload here:\niOS: ${IOS_STORE_URL}\nAndroid: ${ANDROID_STORE_URL}`;
            await Share.share({
                message,
            });
            setOptionsModalVisible(false);
        } catch (error) {
            console.error(error.message);
        }
    };

    const handlePassAndPlay = async () => {
        setOptionsModalVisible(false);
        setLoadingPassAndPlay(true);

        // Load active pass-and-play games
        const games = await getPassAndPlayGames();
        setPassAndPlayGames(games);
        setLoadingPassAndPlay(false);

        // If no games, start new immediately
        if (games.length === 0) {
            onPassAndPlay();
        } else {
            // Show games list
            setPassAndPlayModalVisible(true);
        }
    };

    const handleStartNewPassAndPlay = () => {
        setPassAndPlayModalVisible(false);
        onPassAndPlay();
    };

    const handleResumeGame = (game) => {
        setPassAndPlayModalVisible(false);
        onResumePassAndPlay(game);
    };

    const handleClosePassAndPlayModal = () => {
        setPassAndPlayModalVisible(false);
    };

    const handleDeleteGame = async (gameId) => {
        try {
            setDeletingGameId(gameId);
            await deletePassAndPlayGame(gameId);
            // Reload games list
            const games = await getPassAndPlayGames();
            setPassAndPlayGames(games);
        } catch (error) {
            console.error('Error deleting pass-and-play game:', error);
        } finally {
            setDeletingGameId(null);
        }
    };

    const handleSelectFriend = (friend) => {
        setFriendModalVisible(false);
        setSearchQuery('');
        onSelectFriend(friend.id, friend.displayName);
    };

    const handleCloseFriendModal = () => {
        setFriendModalVisible(false);
        setSearchQuery('');
    };

    const handleCloseOptionsModal = () => {
        setOptionsModalVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                onPress={handleCardPress}
                disabled={disabled || loading}
                activeOpacity={0.8}
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.CARD_BACKGROUND,
                        shadowColor: colors.SHADOW,
                        opacity: disabled ? 0.6 : 1,
                    },
                ]}
            >
                <Block row middle space='between' style={styles.cardContent}>
                    <Block row middle flex>
                        <Block
                            style={[
                                styles.iconContainer,
                                {
                                    backgroundColor: colors.PRIMARY + '15',
                                },
                            ]}
                        >
                            <Icon
                                name='users'
                                family='font-awesome'
                                size={moderateScale(28)}
                                color={colors.PRIMARY}
                            />
                        </Block>
                        <Block flex style={{ marginLeft: theme.SIZES.BASE }}>
                            <Text
                                style={[
                                    styles.title,
                                    {
                                        color: colors.TEXT,
                                    },
                                ]}
                            >
                                Play with Friend
                            </Text>
                            <Text
                                style={[
                                    styles.description,
                                    {
                                        color: colors.TEXT_SECONDARY,
                                    },
                                ]}
                            >
                                Invite a friend to play
                            </Text>
                        </Block>
                    </Block>
                    <Icon
                        name='chevron-right'
                        family='font-awesome'
                        size={16}
                        color={colors.TEXT_SECONDARY}
                    />
                </Block>
            </TouchableOpacity>

            {/* Options Modal - Choose between Invite Friend or Pass & Play */}
            <Modal
                visible={optionsModalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={handleCloseOptionsModal}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.optionsModalContent,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                            },
                        ]}
                    >
                        {/* Header */}
                        <Block
                            row
                            middle
                            space='between'
                            style={[
                                styles.modalHeader,
                                {
                                    borderBottomColor: colors.BORDER_COLOR,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.modalTitle,
                                    {
                                        color: colors.TEXT,
                                    },
                                ]}
                            >
                                Play with Friend
                            </Text>
                            <TouchableOpacity onPress={handleCloseOptionsModal}>
                                <Icon
                                    name='times'
                                    family='font-awesome'
                                    size={24}
                                    color={colors.TEXT_SECONDARY}
                                />
                            </TouchableOpacity>
                        </Block>

                        {/* Options */}
                        <Block style={styles.optionsContainer}>
                            {/* Invite Friend Option */}
                            <TouchableOpacity
                                onPress={handleInviteFriend}
                                style={[
                                    styles.optionItem,
                                    {
                                        backgroundColor: colors.INPUT_BACKGROUND,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                ]}
                            >
                                <Block
                                    style={[
                                        styles.optionIconContainer,
                                        {
                                            backgroundColor: colors.PRIMARY + '15',
                                        },
                                    ]}
                                >
                                    <Icon
                                        name='user-plus'
                                        family='font-awesome'
                                        size={28}
                                        color={colors.PRIMARY}
                                    />
                                </Block>
                                <Block flex style={{ marginLeft: theme.SIZES.BASE }}>
                                    <Text
                                        style={[
                                            styles.optionTitle,
                                            {
                                                color: colors.TEXT,
                                            },
                                        ]}
                                    >
                                        Invite Friend
                                    </Text>
                                    <Text
                                        style={[
                                            styles.optionDescription,
                                            {
                                                color: colors.TEXT_SECONDARY,
                                            },
                                        ]}
                                    >
                                        Send a game invitation to a friend
                                    </Text>
                                </Block>
                                <Icon
                                    name='chevron-right'
                                    family='font-awesome'
                                    size={16}
                                    color={colors.TEXT_SECONDARY}
                                />
                            </TouchableOpacity>

                            {/* Text Friend Option */}
                            <TouchableOpacity
                                onPress={handleTextFriend}
                                style={[
                                    styles.optionItem,
                                    {
                                        backgroundColor: colors.INPUT_BACKGROUND,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                ]}
                            >
                                <Block
                                    style={[
                                        styles.optionIconContainer,
                                        {
                                            backgroundColor: colors.INFO + '15',
                                        },
                                    ]}
                                >
                                    <Icon
                                        name='comment'
                                        family='font-awesome'
                                        size={24}
                                        color={colors.INFO}
                                    />
                                </Block>
                                <Block flex style={{ marginLeft: theme.SIZES.BASE }}>
                                    <Text
                                        style={[
                                            styles.optionTitle,
                                            {
                                                color: colors.TEXT,
                                            },
                                        ]}
                                    >
                                        Text Invite
                                    </Text>
                                    <Text
                                        style={[
                                            styles.optionDescription,
                                            {
                                                color: colors.TEXT_SECONDARY,
                                            },
                                        ]}
                                    >
                                        Send invitations via text
                                    </Text>
                                </Block>
                                <Icon
                                    name='chevron-right'
                                    family='font-awesome'
                                    size={16}
                                    color={colors.TEXT_SECONDARY}
                                />
                            </TouchableOpacity>

                            {/* Pass & Play Option */}
                            <TouchableOpacity
                                onPress={handlePassAndPlay}
                                style={[
                                    styles.optionItem,
                                    {
                                        backgroundColor: colors.INPUT_BACKGROUND,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                ]}
                            >
                                <Block
                                    style={[
                                        styles.optionIconContainer,
                                        {
                                            backgroundColor: colors.SUCCESS + '15',
                                        },
                                    ]}
                                >
                                    <Icon
                                        name='refresh'
                                        family='font-awesome'
                                        size={28}
                                        color={colors.SUCCESS}
                                    />
                                </Block>
                                <Block flex style={{ marginLeft: theme.SIZES.BASE }}>
                                    <Text
                                        style={[
                                            styles.optionTitle,
                                            {
                                                color: colors.TEXT,
                                            },
                                        ]}
                                    >
                                        Pass & Play
                                    </Text>
                                    <Text
                                        style={[
                                            styles.optionDescription,
                                            {
                                                color: colors.TEXT_SECONDARY,
                                            },
                                        ]}
                                    >
                                        Play locally on this device
                                    </Text>
                                </Block>
                                <Icon
                                    name='chevron-right'
                                    family='font-awesome'
                                    size={16}
                                    color={colors.TEXT_SECONDARY}
                                />
                            </TouchableOpacity>
                        </Block>
                    </View>
                </View>
            </Modal>

            {/* Friend Selection Modal */}
            <Modal
                visible={friendModalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={handleCloseFriendModal}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                            },
                        ]}
                    >
                        {/* Header */}
                        <Block
                            row
                            middle
                            space='between'
                            style={[
                                styles.modalHeader,
                                {
                                    borderBottomColor: colors.BORDER_COLOR,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.modalTitle,
                                    {
                                        color: colors.TEXT,
                                    },
                                ]}
                            >
                                Select a Friend
                            </Text>
                            <TouchableOpacity onPress={handleCloseFriendModal}>
                                <Icon
                                    name='times'
                                    family='font-awesome'
                                    size={24}
                                    color={colors.TEXT_SECONDARY}
                                />
                            </TouchableOpacity>
                        </Block>

                        {/* Search Bar */}
                        <Block style={styles.searchContainer}>
                            <Block
                                row
                                middle
                                style={[
                                    styles.searchBar,
                                    {
                                        backgroundColor: colors.INPUT_BACKGROUND,
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                ]}
                            >
                                <Icon
                                    name='search'
                                    family='font-awesome'
                                    size={16}
                                    color={colors.TEXT_SECONDARY}
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    style={[
                                        styles.searchInput,
                                        {
                                            color: colors.TEXT,
                                        },
                                    ]}
                                    placeholder='Search friends...'
                                    placeholderTextColor={colors.TEXT_SECONDARY}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize='none'
                                    autoCorrect={false}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Icon
                                            name='times-circle'
                                            family='font-awesome'
                                            size={16}
                                            color={colors.TEXT_SECONDARY}
                                        />
                                    </TouchableOpacity>
                                )}
                            </Block>
                        </Block>

                        {/* Friends List */}
                        <ScrollView style={styles.friendsList} showsVerticalScrollIndicator={false}>
                            {loading ? (
                                <Block center style={{ padding: theme.SIZES.BASE * 2 }}>
                                    <ActivityIndicator size='large' color={colors.PRIMARY} />
                                </Block>
                            ) : filteredFriends.length === 0 ? (
                                <Block center style={{ padding: theme.SIZES.BASE * 2 }}>
                                    <Icon
                                        name='users'
                                        family='font-awesome'
                                        size={48}
                                        color={colors.TEXT_SECONDARY}
                                        style={{ marginBottom: theme.SIZES.BASE }}
                                    />
                                    <Text
                                        style={[
                                            styles.emptyText,
                                            {
                                                color: colors.TEXT_SECONDARY,
                                            },
                                        ]}
                                    >
                                        {searchQuery
                                            ? 'No friends found'
                                            : 'No friends yet. Add friends to play!'}
                                    </Text>
                                </Block>
                            ) : (
                                filteredFriends.map((friend) => (
                                    <TouchableOpacity
                                        key={friend.id}
                                        onPress={() => handleSelectFriend(friend)}
                                        style={[
                                            styles.friendItem,
                                            {
                                                backgroundColor: colors.INPUT_BACKGROUND,
                                                borderColor: colors.BORDER_COLOR,
                                            },
                                        ]}
                                    >
                                        <Avatar
                                            avatarKey={friend.avatarKey}
                                            size='medium'
                                            style={styles.friendAvatar}
                                        />
                                        <Text
                                            style={[
                                                styles.friendName,
                                                {
                                                    color: colors.TEXT,
                                                },
                                            ]}
                                        >
                                            {friend.displayName}
                                        </Text>
                                        <Icon
                                            name='chevron-right'
                                            family='font-awesome'
                                            size={16}
                                            color={colors.TEXT_SECONDARY}
                                        />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Pass & Play Games Modal */}
            <Modal
                visible={passAndPlayModalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={handleClosePassAndPlayModal}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                            },
                        ]}
                    >
                        {/* Header */}
                        <Block
                            row
                            middle
                            space='between'
                            style={[
                                styles.modalHeader,
                                {
                                    borderBottomColor: colors.BORDER_COLOR,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.modalTitle,
                                    {
                                        color: colors.TEXT,
                                    },
                                ]}
                            >
                                Pass & Play Games
                            </Text>
                            <TouchableOpacity onPress={handleClosePassAndPlayModal}>
                                <Icon
                                    name='times'
                                    family='font-awesome'
                                    size={24}
                                    color={colors.TEXT_SECONDARY}
                                />
                            </TouchableOpacity>
                        </Block>

                        {/* Games List */}
                        <ScrollView
                            style={styles.passAndPlayList}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Start New Game Button */}
                            <TouchableOpacity
                                onPress={handleStartNewPassAndPlay}
                                style={[
                                    styles.passAndPlayItem,
                                    styles.newGameItem,
                                    {
                                        backgroundColor: colors.PRIMARY + '10',
                                        borderColor: colors.PRIMARY,
                                    },
                                ]}
                            >
                                <Block
                                    style={[
                                        styles.newGameIconContainer,
                                        {
                                            backgroundColor: colors.PRIMARY + '20',
                                        },
                                    ]}
                                >
                                    <Icon
                                        name='plus'
                                        family='font-awesome'
                                        size={20}
                                        color={colors.PRIMARY}
                                    />
                                </Block>
                                <Text
                                    style={[
                                        styles.newGameText,
                                        {
                                            color: colors.PRIMARY,
                                        },
                                    ]}
                                >
                                    Start New Game
                                </Text>
                                <Icon
                                    name='chevron-right'
                                    family='font-awesome'
                                    size={16}
                                    color={colors.PRIMARY}
                                />
                            </TouchableOpacity>

                            {/* Active Games */}
                            {loadingPassAndPlay ? (
                                <Block center style={{ padding: theme.SIZES.BASE * 2 }}>
                                    <ActivityIndicator size='large' color={colors.PRIMARY} />
                                </Block>
                            ) : passAndPlayGames.length === 0 ? (
                                <Block center style={{ padding: theme.SIZES.BASE * 2 }}>
                                    <Text
                                        style={[
                                            styles.emptyText,
                                            {
                                                color: colors.TEXT_SECONDARY,
                                            },
                                        ]}
                                    >
                                        No active games
                                    </Text>
                                </Block>
                            ) : (
                                sortedPassAndPlayGames.map((game) => (
                                    <TouchableOpacity
                                        key={game.id}
                                        onPress={() => handleResumeGame(game)}
                                        style={[
                                            styles.passAndPlayItem,
                                            {
                                                backgroundColor: colors.INPUT_BACKGROUND,
                                                borderColor: colors.BORDER_COLOR,
                                                opacity: deletingGameId === game.id ? 0.6 : 1,
                                            },
                                        ]}
                                        disabled={deletingGameId === game.id}
                                    >
                                        <Avatar
                                            avatarKey='crab'
                                            size='small'
                                            style={styles.gameAvatar}
                                        />
                                        <Block flex>
                                            <Text
                                                style={[
                                                    styles.gameTitle,
                                                    {
                                                        color: colors.TEXT,
                                                    },
                                                ]}
                                            >
                                                vs Guest 1
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.gameSubtitle,
                                                    {
                                                        color: colors.TEXT_SECONDARY,
                                                    },
                                                ]}
                                            >
                                                {new Date(game.updatedAt).toLocaleDateString()} •{' '}
                                                {game.timeControl?.type || 'Unlimited'}
                                            </Text>
                                        </Block>
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleDeleteGame(game.id);
                                            }}
                                            style={[
                                                styles.deleteButton,
                                                {
                                                    backgroundColor: colors.ERROR + '10',
                                                },
                                            ]}
                                            disabled={deletingGameId === game.id}
                                        >
                                            {deletingGameId === game.id ? (
                                                <ActivityIndicator
                                                    size='small'
                                                    color={colors.ERROR}
                                                />
                                            ) : (
                                                <Icon
                                                    name='times'
                                                    family='font-awesome'
                                                    size={16}
                                                    color={colors.ERROR}
                                                />
                                            )}
                                        </TouchableOpacity>
                                        <Icon
                                            name='chevron-right'
                                            family='font-awesome'
                                            size={16}
                                            color={colors.TEXT_SECONDARY}
                                            style={{ marginLeft: 8 }}
                                        />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE,
        marginHorizontal: isTablet ? 'auto' : 0,
        width: isTablet ? 650 : width - theme.SIZES.BASE * 2,
        alignSelf: isTablet ? 'center' : 'auto',
        borderRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardContent: {
        padding: theme.SIZES.BASE * 1.5,
    },
    iconContainer: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    optionsModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: theme.SIZES.BASE * 2,
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: '50%',
    },
    modalHeader: {
        padding: theme.SIZES.BASE * 1.5,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    optionsContainer: {
        padding: theme.SIZES.BASE * 1.5,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.SIZES.BASE * 1.5,
        borderRadius: 12,
        marginBottom: theme.SIZES.BASE,
        borderWidth: 1,
    },
    optionIconContainer: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: 14,
    },
    searchContainer: {
        padding: theme.SIZES.BASE,
    },
    searchBar: {
        borderRadius: 10,
        paddingHorizontal: theme.SIZES.BASE,
        paddingVertical: theme.SIZES.BASE * 0.75,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: theme.SIZES.BASE * 0.75,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    friendsList: {
        flex: 1,
        paddingHorizontal: theme.SIZES.BASE,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.SIZES.BASE,
        borderRadius: 10,
        marginBottom: theme.SIZES.BASE * 0.75,
        borderWidth: 1,
    },
    friendAvatar: {
        marginRight: theme.SIZES.BASE,
    },
    friendName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    passAndPlayList: {
        flex: 1,
        paddingHorizontal: theme.SIZES.BASE,
        paddingTop: theme.SIZES.BASE,
    },
    passAndPlayItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.SIZES.BASE,
        borderRadius: 10,
        marginBottom: theme.SIZES.BASE * 0.75,
        borderWidth: 1,
    },
    newGameItem: {
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    newGameIconContainer: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.SIZES.BASE,
    },
    newGameText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    gameAvatar: {
        marginRight: theme.SIZES.BASE,
    },
    gameTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    gameSubtitle: {
        fontSize: 12,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
});
