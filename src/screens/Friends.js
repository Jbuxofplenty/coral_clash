import { Block, Text, theme } from 'galio-framework';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    TextInput,
    Dimensions,
    View,
    RefreshControl,
} from 'react-native';

import { Icon, Avatar, LoadingScreen, TimeControlModal } from '../components';
import { useAuth, useTheme } from '../contexts';
import { useFriends, useUserSearch, useGame } from '../hooks';

const { width } = Dimensions.get('screen');

export default function Friends({ navigation }) {
    const { user } = useAuth();
    const { colors, isDarkMode } = useTheme();
    const { sendGameRequest } = useGame();

    // Friends management
    const {
        loading,
        refreshing,
        friends,
        incomingRequests,
        outgoingRequests,
        removingFriendId,
        acceptingRequestId,
        decliningRequestId,
        handleRefresh,
        handleRemoveFriend,
        handleAcceptRequest,
        handleDeclineRequest,
        handleCancelRequest,
    } = useFriends();

    // User search
    const {
        searchQuery,
        searchResults,
        searching,
        showDropdown,
        sending,
        handleSearch,
        handleSearchFocus,
        handleSearchBlur,
        handleSelectUser,
    } = useUserSearch();

    // Time control modal state
    const [timeControlModalVisible, setTimeControlModalVisible] = useState(false);
    const [pendingGameRequest, setPendingGameRequest] = useState(null);

    const handleStartGame = async (friendId, friendName) => {
        setPendingGameRequest({ friendId, friendName });
        setTimeControlModalVisible(true);
    };

    const handleTimeControlSelect = async (timeControl) => {
        setTimeControlModalVisible(false);
        if (pendingGameRequest) {
            await sendGameRequest(
                pendingGameRequest.friendId,
                pendingGameRequest.friendName,
                timeControl,
            );
            setPendingGameRequest(null);
        }
    };

    const handleTimeControlCancel = () => {
        setTimeControlModalVisible(false);
        setPendingGameRequest(null);
    };

    const renderFriendItem = (friend) => {
        const displayName = friend.displayName || 'User';
        const isRemoving = removingFriendId === friend.id;

        return (
            <Block
                key={friend.id}
                style={[
                    styles.friendItem,
                    {
                        backgroundColor: colors.CARD_BACKGROUND,
                        borderColor: colors.BORDER_COLOR,
                        shadowColor: colors.SHADOW,
                        opacity: isRemoving ? 0.6 : 1,
                    },
                ]}
            >
                <Block row middle space='between'>
                    <Block row middle flex>
                        <Avatar
                            avatarKey={friend.avatarKey}
                            size='medium'
                            style={styles.avatarContainer}
                        />
                        <Block flex style={{ marginRight: 8 }}>
                            <Text
                                size={16}
                                bold
                                color={colors.TEXT}
                                numberOfLines={1}
                                style={styles.friendName}
                            >
                                {displayName}
                            </Text>
                            {friend.email && (
                                <Text
                                    size={13}
                                    color={colors.TEXT_SECONDARY}
                                    numberOfLines={1}
                                    style={{ marginTop: 2 }}
                                >
                                    {friend.email}
                                </Text>
                            )}
                        </Block>
                    </Block>
                    <Block row>
                        <TouchableOpacity
                            onPress={() => handleStartGame(friend.id, displayName)}
                            disabled={isRemoving}
                            style={[
                                styles.actionButton,
                                { backgroundColor: colors.SUCCESS + '10', marginRight: 8 },
                            ]}
                        >
                            <Icon
                                name='gamepad'
                                family='font-awesome'
                                size={18}
                                color={colors.SUCCESS}
                            />
                        </TouchableOpacity>
                        {isRemoving ? (
                            <View
                                style={[
                                    styles.removeButton,
                                    { backgroundColor: colors.ERROR + '10' },
                                ]}
                            >
                                <ActivityIndicator size='small' color={colors.ERROR} />
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={() => handleRemoveFriend(friend.id, displayName)}
                                style={[
                                    styles.removeButton,
                                    { backgroundColor: colors.ERROR + '10' },
                                ]}
                            >
                                <Icon
                                    name='user-times'
                                    family='font-awesome'
                                    size={18}
                                    color={colors.ERROR}
                                />
                            </TouchableOpacity>
                        )}
                    </Block>
                </Block>
            </Block>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps='handled'
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.PRIMARY}
                        colors={[colors.PRIMARY]}
                    />
                }
            >
                <Block>
                    {/* Add Friend Section */}
                    <Block
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                                borderColor: colors.BORDER_COLOR,
                                shadowColor: colors.SHADOW,
                            },
                        ]}
                    >
                        <Text size={18} bold color={colors.TEXT} style={{ marginBottom: 16 }}>
                            Add Friend
                        </Text>
                        <Block>
                            <Block row middle>
                                <Block flex style={{ marginRight: 12 }}>
                                    <TextInput
                                        placeholder='Search by username'
                                        placeholderTextColor={colors.PLACEHOLDER}
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                        onFocus={handleSearchFocus}
                                        onBlur={handleSearchBlur}
                                        autoCapitalize='none'
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: colors.INPUT,
                                                color: colors.TEXT,
                                                borderColor: showDropdown
                                                    ? colors.PRIMARY
                                                    : colors.BORDER_COLOR,
                                            },
                                        ]}
                                    />
                                </Block>
                                {searching && (
                                    <ActivityIndicator
                                        size='small'
                                        color={colors.PRIMARY}
                                        style={{ marginRight: 12 }}
                                    />
                                )}
                            </Block>

                            {/* Search Results Dropdown */}
                            {showDropdown && searchQuery.trim().length >= 2 && (
                                <Block
                                    style={[
                                        styles.dropdown,
                                        {
                                            backgroundColor: colors.CARD_BACKGROUND,
                                            borderColor: colors.BORDER_COLOR,
                                            shadowColor: colors.SHADOW,
                                        },
                                    ]}
                                >
                                    {searchResults.length === 0 && !searching ? (
                                        <Block style={styles.dropdownItem}>
                                            <Text size={14} color={colors.TEXT_SECONDARY} center>
                                                No users found
                                            </Text>
                                        </Block>
                                    ) : (
                                        searchResults.map((searchUser) => (
                                            <Pressable
                                                key={searchUser.id}
                                                onPress={() => handleSelectUser(searchUser)}
                                                disabled={searchUser.hasPendingRequest}
                                                style={({ pressed }) => [
                                                    styles.dropdownItem,
                                                    {
                                                        backgroundColor: pressed
                                                            ? colors.PRIMARY + '10'
                                                            : 'transparent',
                                                    },
                                                    searchUser.hasPendingRequest && {
                                                        opacity: 0.5,
                                                    },
                                                ]}
                                            >
                                                <Block row middle space='between'>
                                                    <Block row middle flex>
                                                        <Avatar
                                                            avatarKey={searchUser.avatarKey}
                                                            size='small'
                                                            style={styles.dropdownAvatar}
                                                        />
                                                        <Block flex>
                                                            <Text
                                                                size={15}
                                                                bold
                                                                color={colors.TEXT}
                                                                numberOfLines={1}
                                                            >
                                                                {searchUser.displayName}
                                                            </Text>
                                                        </Block>
                                                    </Block>
                                                    {searchUser.hasPendingRequest ? (
                                                        <Text
                                                            size={12}
                                                            color={colors.WARNING}
                                                            style={{ marginLeft: 8 }}
                                                        >
                                                            Pending
                                                        </Text>
                                                    ) : (
                                                        <Icon
                                                            name='user-plus'
                                                            family='font-awesome'
                                                            size={16}
                                                            color={colors.PRIMARY}
                                                        />
                                                    )}
                                                </Block>
                                            </Pressable>
                                        ))
                                    )}
                                </Block>
                            )}
                        </Block>
                    </Block>

                    {/* Incoming Friend Requests Section */}
                    {incomingRequests.length > 0 && (
                        <Block style={styles.section}>
                            <Text
                                size={20}
                                bold
                                color={colors.TEXT}
                                style={{ marginBottom: 12, paddingHorizontal: 4 }}
                            >
                                Incoming Requests ({incomingRequests.length})
                            </Text>
                            <Block style={styles.friendsList}>
                                {incomingRequests.map((request) => {
                                    const displayName = request.displayName || 'User';
                                    const isProcessing =
                                        acceptingRequestId === request.requestId ||
                                        decliningRequestId === request.requestId;
                                    return (
                                        <Block
                                            key={request.id}
                                            style={[
                                                styles.friendItem,
                                                {
                                                    backgroundColor: colors.CARD_BACKGROUND,
                                                    borderColor: colors.BORDER_COLOR,
                                                    shadowColor: colors.SHADOW,
                                                    opacity: isProcessing ? 0.6 : 1,
                                                },
                                            ]}
                                        >
                                            <Block row middle space='between'>
                                                <Block row middle flex>
                                                    <Avatar
                                                        avatarKey={request.avatarKey}
                                                        size='medium'
                                                        style={styles.avatarContainer}
                                                    />
                                                    <Block flex style={{ marginRight: 8 }}>
                                                        <Text
                                                            size={16}
                                                            bold
                                                            color={colors.TEXT}
                                                            numberOfLines={1}
                                                            style={styles.friendName}
                                                        >
                                                            {displayName}
                                                        </Text>
                                                    </Block>
                                                </Block>
                                                <Block row>
                                                    {acceptingRequestId === request.requestId ? (
                                                        <View
                                                            style={[
                                                                styles.actionButton,
                                                                {
                                                                    backgroundColor:
                                                                        colors.SUCCESS + '10',
                                                                },
                                                            ]}
                                                        >
                                                            <ActivityIndicator
                                                                size='small'
                                                                color={colors.SUCCESS}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() =>
                                                                handleAcceptRequest(
                                                                    request.requestId,
                                                                    request.id,
                                                                )
                                                            }
                                                            disabled={
                                                                decliningRequestId ===
                                                                request.requestId
                                                            }
                                                            style={[
                                                                styles.actionButton,
                                                                {
                                                                    backgroundColor:
                                                                        colors.SUCCESS + '10',
                                                                },
                                                            ]}
                                                        >
                                                            <Icon
                                                                name='check'
                                                                family='font-awesome'
                                                                size={18}
                                                                color={colors.SUCCESS}
                                                            />
                                                        </TouchableOpacity>
                                                    )}
                                                    {decliningRequestId === request.requestId ? (
                                                        <View
                                                            style={[
                                                                styles.actionButton,
                                                                {
                                                                    backgroundColor:
                                                                        colors.ERROR + '10',
                                                                    marginLeft: 8,
                                                                },
                                                            ]}
                                                        >
                                                            <ActivityIndicator
                                                                size='small'
                                                                color={colors.ERROR}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() =>
                                                                handleDeclineRequest(
                                                                    request.requestId,
                                                                )
                                                            }
                                                            disabled={
                                                                acceptingRequestId ===
                                                                request.requestId
                                                            }
                                                            style={[
                                                                styles.actionButton,
                                                                {
                                                                    backgroundColor:
                                                                        colors.ERROR + '10',
                                                                    marginLeft: 8,
                                                                },
                                                            ]}
                                                        >
                                                            <Icon
                                                                name='times'
                                                                family='font-awesome'
                                                                size={18}
                                                                color={colors.ERROR}
                                                            />
                                                        </TouchableOpacity>
                                                    )}
                                                </Block>
                                            </Block>
                                        </Block>
                                    );
                                })}
                            </Block>
                        </Block>
                    )}

                    {/* Outgoing Friend Requests Section */}
                    {outgoingRequests.length > 0 && (
                        <Block style={styles.section}>
                            <Text
                                size={20}
                                bold
                                color={colors.TEXT}
                                style={{ marginBottom: 12, paddingHorizontal: 4 }}
                            >
                                Sent Requests ({outgoingRequests.length})
                            </Text>
                            <Block style={styles.friendsList}>
                                {outgoingRequests.map((request) => {
                                    const displayName = request.displayName || 'User';
                                    const isCanceling = decliningRequestId === request.requestId;
                                    return (
                                        <Block
                                            key={request.id}
                                            style={[
                                                styles.friendItem,
                                                {
                                                    backgroundColor: colors.CARD_BACKGROUND,
                                                    borderColor: colors.BORDER_COLOR,
                                                    shadowColor: colors.SHADOW,
                                                    opacity: isCanceling ? 0.6 : 1,
                                                },
                                            ]}
                                        >
                                            <Block row middle space='between'>
                                                <Block row middle flex>
                                                    <Avatar
                                                        avatarKey={request.avatarKey}
                                                        size='medium'
                                                        style={styles.avatarContainer}
                                                    />
                                                    <Block flex style={{ marginRight: 8 }}>
                                                        <Text
                                                            size={16}
                                                            bold
                                                            color={colors.TEXT}
                                                            numberOfLines={1}
                                                            style={styles.friendName}
                                                        >
                                                            {displayName}
                                                        </Text>
                                                    </Block>
                                                </Block>
                                                {isCanceling ? (
                                                    <View
                                                        style={[
                                                            styles.actionButton,
                                                            {
                                                                backgroundColor:
                                                                    colors.ERROR + '10',
                                                            },
                                                        ]}
                                                    >
                                                        <ActivityIndicator
                                                            size='small'
                                                            color={colors.ERROR}
                                                        />
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity
                                                        onPress={() =>
                                                            handleCancelRequest(
                                                                request.requestId,
                                                                displayName,
                                                            )
                                                        }
                                                        style={[
                                                            styles.actionButton,
                                                            {
                                                                backgroundColor:
                                                                    colors.ERROR + '10',
                                                            },
                                                        ]}
                                                    >
                                                        <Icon
                                                            name='times'
                                                            family='font-awesome'
                                                            size={18}
                                                            color={colors.ERROR}
                                                        />
                                                    </TouchableOpacity>
                                                )}
                                            </Block>
                                        </Block>
                                    );
                                })}
                            </Block>
                        </Block>
                    )}

                    {/* Friends List Section */}
                    <Block style={styles.section}>
                        <Text
                            size={20}
                            bold
                            color={colors.TEXT}
                            style={{ marginBottom: 12, paddingHorizontal: 4 }}
                        >
                            My Friends ({friends.length})
                        </Text>
                        {friends.length === 0 ? (
                            <Block
                                center
                                style={[
                                    styles.emptyContainer,
                                    {
                                        backgroundColor: colors.CARD_BACKGROUND,
                                        borderColor: colors.BORDER_COLOR,
                                        shadowColor: colors.SHADOW,
                                    },
                                ]}
                            >
                                <Block
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 40,
                                        backgroundColor: colors.PRIMARY + '15',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginBottom: 16,
                                    }}
                                >
                                    <Icon
                                        name='users'
                                        family='font-awesome'
                                        size={36}
                                        color={colors.PRIMARY}
                                    />
                                </Block>
                                <Text
                                    size={16}
                                    bold
                                    color={colors.TEXT}
                                    style={{ marginBottom: 8 }}
                                >
                                    No Friends Yet
                                </Text>
                                <Text
                                    size={14}
                                    color={colors.TEXT_SECONDARY}
                                    center
                                    style={{ maxWidth: 240 }}
                                >
                                    Add friends by username above to start playing together!
                                </Text>
                            </Block>
                        ) : (
                            <Block style={styles.friendsList}>
                                {friends.map((friend) => renderFriendItem(friend))}
                            </Block>
                        )}
                    </Block>
                </Block>
            </ScrollView>

            {/* Time Control Modal */}
            <TimeControlModal
                visible={timeControlModalVisible}
                onSelect={handleTimeControlSelect}
                onCancel={handleTimeControlCancel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        paddingBottom: 30,
        padding: theme.SIZES.BASE * 1.5,
    },
    card: {
        borderRadius: 12,
        padding: theme.SIZES.BASE * 1.5,
        marginBottom: theme.SIZES.BASE * 2,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    section: {
        marginBottom: theme.SIZES.BASE,
    },
    input: {
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: theme.SIZES.BASE * 1.5,
        fontSize: 15,
    },
    dropdown: {
        marginTop: 8,
        borderRadius: 10,
        borderWidth: 1,
        maxHeight: 300,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    dropdownItem: {
        padding: theme.SIZES.BASE * 1.25,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dropdownAvatar: {
        marginRight: theme.SIZES.BASE,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    friendsList: {
        marginTop: 4,
    },
    friendItem: {
        borderRadius: 12,
        padding: theme.SIZES.BASE * 1.25,
        marginBottom: theme.SIZES.BASE,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: theme.SIZES.BASE * 1.25,
    },
    friendName: {
        marginBottom: 2,
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingBadge: {
        paddingHorizontal: theme.SIZES.BASE,
        paddingVertical: theme.SIZES.BASE * 0.5,
        borderRadius: 12,
    },
    emptyContainer: {
        paddingVertical: theme.SIZES.BASE * 4,
        paddingHorizontal: theme.SIZES.BASE * 2,
        borderRadius: 12,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
});
