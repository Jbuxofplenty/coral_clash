import { useState, useRef } from 'react';
import { useAlert } from '../contexts';
import { useFirebaseFunctions } from './useFirebaseFunctions';

export const useUserSearch = () => {
    const { showAlert } = useAlert();
    const { searchUsers, sendFriendRequest } = useFirebaseFunctions();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [sending, setSending] = useState(false);
    const searchTimeoutRef = useRef(null);

    const handleSearch = async (query) => {
        setSearchQuery(query);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Hide dropdown if query is too short
        if (query.trim().length < 2) {
            setShowDropdown(false);
            setSearchResults([]);
            return;
        }

        // Debounce search
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                setSearching(true);
                setShowDropdown(true);
                const result = await searchUsers(query);
                setSearchResults(result.users || []);
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const handleSearchFocus = () => {
        // Show dropdown only if there's a valid search query and results exist
        if (searchQuery.trim().length >= 2 && (searchResults.length > 0 || searching)) {
            setShowDropdown(true);
        }
    };

    const handleSearchBlur = () => {
        // Hide dropdown when focus is lost
        setTimeout(() => {
            setShowDropdown(false);
        }, 200);
    };

    const handleSelectUser = async (selectedUser) => {
        if (selectedUser.hasPendingRequest) {
            showAlert(
                'Pending Request',
                'You already have a pending friend request with this user.',
            );
            return;
        }

        try {
            setSending(true);
            await sendFriendRequest(selectedUser.id);
            // Clear search state completely
            setSearchQuery('');
            setShowDropdown(false);
            setSearchResults([]);
            // Clear any pending search timeouts
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            // Note: Real-time listener will auto-update the UI
        } catch (error) {
            console.error('Error sending friend request:', error);
            showAlert('Error', error.message || 'Failed to send friend request');
        } finally {
            setSending(false);
        }
    };

    return {
        // State
        searchQuery,
        searchResults,
        searching,
        showDropdown,
        sending,
        searchTimeoutRef,

        // Handlers
        handleSearch,
        handleSearchFocus,
        handleSearchBlur,
        handleSelectUser,
    };
};
