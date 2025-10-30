import { Block, Text, theme } from 'galio-framework';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { useTheme } from '../contexts';
import Avatar from './Avatar';
import Icon from './Icon';

const { width } = Dimensions.get('screen');

/**
 * Card component that allows users to select a friend and start a game
 * @param {Array} friends - List of friends to display
 * @param {boolean} loading - Loading state for friends
 * @param {boolean} disabled - Whether the card is disabled
 * @param {Function} onSelectFriend - Callback when friend is selected (receives friendId, friendName)
 */
export default function PlayWithFriendCard({ friends, loading, disabled, onSelectFriend }) {
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const handleCardPress = () => {
        if (disabled || loading) return;
        setModalVisible(true);
        setSearchQuery(''); // Reset search when opening
    };

    const handleSelectFriend = (friend) => {
        setModalVisible(false);
        setSearchQuery('');
        onSelectFriend(friend.id, friend.displayName);
    };

    const handleClose = () => {
        setModalVisible(false);
        setSearchQuery('');
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

            {/* Friend Selection Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType='slide'
                onRequestClose={handleClose}
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
                            <TouchableOpacity onPress={handleClose}>
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
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE,
        marginHorizontal: width > 600 ? 'auto' : 0,
        maxWidth: width > 600 ? 600 : '100%',
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
});
