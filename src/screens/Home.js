import { Block, Input, theme } from 'galio-framework';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, Product } from '../components/';
import FixtureLoaderModal from '../components/FixtureLoaderModal';
import products from '../constants/products';

const { width, height } = Dimensions.get('screen');

export default class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fixtureModalVisible: false,
        };
    }
    renderSearch = () => {
        const { navigation } = this.props;
        const iconCamera = (
            <Icon size={16} color={theme.COLORS.MUTED} name='zoom-in' family='material' />
        );

        return (
            <Input
                right
                color='black'
                style={styles.search}
                iconContent={iconCamera}
                placeholder='What are you looking for?'
            />
        );
    };

    handleProductPress = (product) => {
        if (product.isDevFixtureLoader) {
            // Open fixture loader modal
            this.setState({ fixtureModalVisible: true });
        } else {
            // Navigate to game
            this.props.navigation.navigate('Game', { product: product });
        }
    };

    handleSelectFixture = (fixture, fixtureName) => {
        console.log('Loading fixture:', fixtureName);
        // Navigate to game with the fixture
        this.props.navigation.navigate('Game', {
            product: {
                title: `Loaded: ${fixtureName}`,
                isFixture: true,
            },
            fixture: fixture,
        });
    };

    renderProducts = () => {
        return (
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
                            onPress={() => this.handleProductPress(product)}
                        />
                    ))}
                </Block>
            </ScrollView>
        );
    };

    render() {
        return (
            <LinearGradient colors={['#1e3c72', '#2a5298', '#7e8ba3']} style={styles.gradient}>
                <Block flex center style={styles.home}>
                    {this.renderProducts()}
                </Block>

                <FixtureLoaderModal
                    visible={this.state.fixtureModalVisible}
                    onClose={() => this.setState({ fixtureModalVisible: false })}
                    onSelectFixture={this.handleSelectFixture}
                />
            </LinearGradient>
        );
    }
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
