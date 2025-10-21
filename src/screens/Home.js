import { Block, Input, theme } from 'galio-framework';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, Product } from '../components/';
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
            <Block flex center style={styles.home}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.products}
                >
                    <Block flex style={styles.productContainer}>
                        {products.map((product, index) => (
                            <Product
                                key={index}
                                product={product}
                                horizontal
                                onPress={() => handleProductPress(product)}
                            />
                        ))}
                    </Block>
                </ScrollView>
            </Block>

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
    home: {
        width: width,
    },
    productContainer: {
        paddingHorizontal: theme.SIZES.BASE,
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
    products: {
        width: width,
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE,
    },
});
