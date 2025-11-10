import { FIXTURES as FIXTURE_FILES } from '@jbuxofplenty/coral-clash/game/__fixtures__';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../contexts';
import Icon from './Icon';

// Available fixtures - keep this list updated when adding new fixtures
const FIXTURES = [
    { name: 'whale-rotation', label: 'Whale Rotation Bug Fix' },
    { name: 'whale-rotation-4', label: '🐋 Whale Rotation #4 (UI Bug)' },
    { name: 'octo-deleted', label: '🐙 Octopus Deleted Bug' },
    { name: 'whale-double-jeopardy', label: 'Whale Double Jeopardy' },
    { name: 'whale-double-jeopardy-2', label: 'Whale on Coral Bug Fix' },
    { name: 'whale-move-diagonally', label: 'Whale Diagonal Movement' },
    { name: 'whale-move-diagonally-2', label: 'Whale Diagonal #2' },
    { name: 'whale-remove-2-coral', label: 'Whale Remove 2 Coral' },
    { name: 'octopus-check', label: 'Octopus Check (Debug)' },
    { name: 'multiple-checks', label: 'Multiple Checks (Pinned Piece)' },
    { name: 'check-pinned', label: 'Check with Pinned Piece' },
    { name: 'check-pinned-2', label: 'Check with Pinned Piece #2' },
    { name: 'crab-end-of-board', label: 'Crab Reaches End (Tie Game)' },
    { name: 'coral-blocks-attack', label: 'Coral Blocks Attack' },
    { name: 'whale-removes-coral', label: 'Whale Removes Coral' },
    { name: 'crab-movement', label: 'Crab Movement Debug' },
    { name: 'whale-check', label: '🐋 Whale Check #1' },
    { name: 'whale-check-2', label: '🐋 Whale Check #2' },
    { name: 'whale-check-3', label: '🐋 Whale Check #3' },
    { name: 'whale-check-4', label: '🐋 Whale Check #4' },
    { name: 'whale-check-5', label: '🐋 Whale Check #5' },
    { name: 'whale-check-6', label: '🐋 Whale Check #6' },
    { name: 'whale-check-7', label: '🐋 Whale Check #7 (Puffer Block)' },
    { name: 'whale-check-8', label: '🐋 Whale Check #8 (Turtle Protection)' },
    { name: 'whale-check-9', label: '🐋 Whale Check #9 (Coral Capture)' },
    { name: 'whale-check-10', label: '🐋 Whale Check #10' },
    { name: 'whale-check-11', label: '🐋 Whale Check #11' },
    { name: 'whale-check-12', label: '🐋 Whale Check #12 (Capture Move)' },
    { name: 'whale-check-13', label: '🐋 Whale Check #13 (Protected Whale)' },
    { name: 'whale-attack', label: '🐋 Whale Attack (UI Bug)' },
];

const FixtureLoaderModal = ({ visible, onClose, onSelectFixture }) => {
    const [selectedFixture, setSelectedFixture] = useState(null);
    const [selectedMode, setSelectedMode] = useState('computer'); // Default to computer mode
    const { showAlert } = useAlert();

    const gameModes = [
        { value: 'computer', label: 'vs Computer', icon: 'computer' },
        { value: 'passandplay', label: 'Pass & Play', icon: 'people' },
    ];

    const handleSelectFixture = (fixtureName) => {
        setSelectedFixture(fixtureName);
    };

    const handleCancelSelection = () => {
        setSelectedFixture(null);
        setSelectedMode('computer');
    };

    const handleLoadFixture = () => {
        if (!selectedFixture) return;

        // Load the fixture and navigate with selected mode
        try {
            const fixture = FIXTURE_FILES[selectedFixture];
            if (!fixture) {
                throw new Error(`Fixture not found: ${selectedFixture}`);
            }
            onSelectFixture(fixture, selectedFixture, selectedMode);
            onClose();
            // Reset selections for next time
            setSelectedFixture(null);
            setSelectedMode('computer');
        } catch (error) {
            showAlert('Error', `Failed to load fixture: ${error.message}`);
        }
    };

    return (
        <Modal visible={visible} animationType='slide' transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Load Game State</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name='close' family='MaterialIcons' size={24} color='#333' />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.fixtureList}>
                        {FIXTURES.map((fixture) => (
                            <TouchableOpacity
                                key={fixture.name}
                                style={[
                                    styles.fixtureItem,
                                    selectedFixture === fixture.name && styles.fixtureItemSelected,
                                ]}
                                onPress={() => handleSelectFixture(fixture.name)}
                            >
                                <View style={styles.fixtureItemContent}>
                                    <Icon
                                        name='description'
                                        family='MaterialIcons'
                                        size={24}
                                        color='#1e3c72'
                                    />
                                    <View style={styles.fixtureTextContainer}>
                                        <Text style={styles.fixtureLabel}>{fixture.label}</Text>
                                        <Text style={styles.fixtureFilename}>
                                            {fixture.name}.json
                                        </Text>
                                    </View>
                                </View>
                                <Icon
                                    name='chevron-right'
                                    family='MaterialIcons'
                                    size={24}
                                    color='#ccc'
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {selectedFixture && (
                        <View style={styles.modeSelector}>
                            <View style={styles.modeSelectorHeader}>
                                <Text style={styles.modeSelectorTitle}>Game Mode:</Text>
                                <TouchableOpacity
                                    onPress={handleCancelSelection}
                                    style={styles.cancelButton}
                                >
                                    <Icon
                                        name='arrow-back'
                                        family='MaterialIcons'
                                        size={20}
                                        color='#666'
                                    />
                                    <Text style={styles.cancelButtonText}>Back</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modeOptions}>
                                {gameModes.map((mode) => (
                                    <TouchableOpacity
                                        key={mode.value}
                                        style={[
                                            styles.modeButton,
                                            selectedMode === mode.value &&
                                                styles.modeButtonSelected,
                                        ]}
                                        onPress={() => setSelectedMode(mode.value)}
                                    >
                                        <Icon
                                            name={mode.icon}
                                            family='MaterialIcons'
                                            size={20}
                                            color={selectedMode === mode.value ? '#fff' : '#1e3c72'}
                                        />
                                        <Text
                                            style={[
                                                styles.modeButtonText,
                                                selectedMode === mode.value &&
                                                    styles.modeButtonTextSelected,
                                            ]}
                                        >
                                            {mode.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={styles.modalFooter}>
                        {selectedFixture ? (
                            <TouchableOpacity style={styles.loadButton} onPress={handleLoadFixture}>
                                <Text style={styles.loadButtonText}>Load Game</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.footerText}>
                                💡 Fixtures are from shared/game/__fixtures__/
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    fixtureList: {
        padding: 16,
    },
    fixtureItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    fixtureItemSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#1e3c72',
    },
    fixtureItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fixtureTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    fixtureLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    fixtureFilename: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        marginTop: 8,
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    modeSelector: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#f5f5f5',
    },
    modeSelectorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modeSelectorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    modeOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        gap: 8,
    },
    modeButtonSelected: {
        backgroundColor: '#1e3c72',
        borderColor: '#1e3c72',
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e3c72',
    },
    modeButtonTextSelected: {
        color: '#fff',
    },
    loadButton: {
        backgroundColor: '#1e3c72',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    loadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default FixtureLoaderModal;
