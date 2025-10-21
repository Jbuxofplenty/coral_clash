import { Block, Input, theme } from 'galio-framework';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, Product, ActiveGamesCard, GameHistoryCard } from '../components/';
import FixtureLoaderModal from '../components/FixtureLoaderModal';
import products from '../constants/products';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('screen');

export default function Home({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const [fixtureModalVisible, setFixtureModalVisible] = useState(false);

    const handleProductPress = (product) => {
        if (product.isDevFixtureLoader) {
            // Open fixture loader modal
            setFixtureModalVisible(true);
        } else {
            // Navigate to game
            navigation.navigate('Game', { product: product });
        }
    };

    const handleSelectFixture = (fixture, fixtureName) => {
        console.log('Loading fixture:', fixtureName);
        // Navigate to game with the fixture
        navigation.navigate('Game', {
            product: {
                title: `Loaded: ${fixtureName}`,
                isFixture: true,
            },
            fixture: fixture,
        });
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
                {/* Active Games Card */}
                <ActiveGamesCard navigation={navigation} />

                {/* Game Mode Cards */}
                {products.map((product, index) => (
                    <Product
                        key={index}
                        product={product}
                        horizontal
                        onPress={() => handleProductPress(product)}
                    />
                ))}

                {/* Game History Card */}
                <GameHistoryCard navigation={navigation} />
            </ScrollView>

            <FixtureLoaderModal
                visible={fixtureModalVisible}
                onClose={() => setFixtureModalVisible(false)}
                onSelectFixture={handleSelectFixture}
            />
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
    },
    search: {
        height: 48,
        width: width - 32,
        marginHorizontal: 16,
        borderWidth: 1,
        borderRadius: 3,
    },
    header: {
        backgroundColor: theme.COLORS.WHITE,
        shadowColor: theme.COLORS.BLACK,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
        zIndex: 2,
    },
    tabs: {
        marginBottom: 24,
        marginTop: 10,
        elevation: 4,
    },
    tab: {
        backgroundColor: theme.COLORS.TRANSPARENT,
        width: width * 0.5,
        borderRadius: 0,
        borderWidth: 0,
        height: 24,
        elevation: 0,
    },
    tabTitle: {
        lineHeight: 19,
        fontWeight: '300',
    },
    divider: {
        borderRightWidth: 0.3,
        borderRightColor: theme.COLORS.MUTED,
    },
});
