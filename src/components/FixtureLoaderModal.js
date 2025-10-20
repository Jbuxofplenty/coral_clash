import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    Alert,
} from 'react-native';
import { Block, theme } from 'galio-framework';
import Icon from './Icon';

const { width } = Dimensions.get('screen');

// Import all fixtures statically (required for React Native bundler)
const FIXTURE_FILES = {
    'example-initial-state': require('../hooks/__fixtures__/example-initial-state.json'),
    'whale-move-diagonally': require('../hooks/__fixtures__/whale-move-diagonally.json'),
    'whale-move-diagonally-2': require('../hooks/__fixtures__/whale-move-diagonally-2.json'),
    'octopus-check': require('../hooks/__fixtures__/octopus-check.json'),
    'multiple-checks': require('../hooks/__fixtures__/multiple-checks.json'),
    'check-pinned': require('../hooks/__fixtures__/check-pinned.json'),
    'check-pinned-2': require('../hooks/__fixtures__/check-pinned-2.json'),
    'crab-end-of-board': require('../hooks/__fixtures__/crab-end-of-board.json'),
};

// Available fixtures - keep this list updated when adding new fixtures
const FIXTURES = [
    { name: 'example-initial-state', label: 'Example Initial State' },
    { name: 'whale-move-diagonally', label: 'Whale Diagonal Movement' },
    { name: 'whale-move-diagonally-2', label: 'Whale Diagonal #2' },
    { name: 'octopus-check', label: 'Octopus Check (Debug)' },
    { name: 'multiple-checks', label: 'Multiple Checks (Pinned Piece)' },
    { name: 'check-pinned', label: 'Check with Pinned Piece' },
    { name: 'check-pinned-2', label: 'Check with Pinned Piece #2' },
    { name: 'crab-end-of-board', label: 'Crab Reaches End (Tie Game)' },
];

const FixtureLoaderModal = ({ visible, onClose, onSelectFixture }) => {
    const [selectedFixture, setSelectedFixture] = useState(null);

    const handleSelectFixture = (fixtureName) => {
        setSelectedFixture(fixtureName);

        // Load the fixture and navigate
        try {
            const fixture = FIXTURE_FILES[fixtureName];
            if (!fixture) {
                throw new Error(`Fixture not found: ${fixtureName}`);
            }
            onSelectFixture(fixture, fixtureName);
            onClose();
        } catch (error) {
            Alert.alert('Error', `Failed to load fixture: ${error.message}`);
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

                    <View style={styles.modalFooter}>
                        <Text style={styles.footerText}>
                            💡 Fixtures are from src/hooks/__fixtures__/
                        </Text>
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
});

export default FixtureLoaderModal;
