import { useNavigation } from '@react-navigation/native';
import { Block, Text, theme } from 'galio-framework';
import React from 'react';
import { Dimensions, Image, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('screen');

function Product({
    navigation,
    product,
    horizontal,
    full,
    style,
    priceColor,
    imageStyle,
    onPress,
}) {
    const { colors } = useTheme();

    const imageStyles = [
        styles.image,
        full ? styles.fullImage : styles.horizontalImage,
        imageStyle,
    ];

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.navigate('Game', { product: product });
        }
    };

    return (
        <TouchableWithoutFeedback onPress={handlePress}>
            <Block
                row={horizontal}
                card
                style={[
                    styles.product,
                    styles.shadow,
                    { backgroundColor: colors.CARD_BACKGROUND },
                    style,
                ]}
            >
                <Block style={[styles.imageContainer, styles.shadow]}>
                    {product.icon ? (
                        <View style={[imageStyles, styles.iconContainer]}>
                            <Icon
                                name={product.icon}
                                family={product.iconFamily}
                                size={80}
                                color={colors.PRIMARY}
                            />
                        </View>
                    ) : (
                        <Image source={product.image} style={imageStyles} />
                    )}
                </Block>
                <Block flex space='between' style={styles.productDescription}>
                    <Text size={18} bold style={[styles.productTitle, { color: colors.TEXT }]}>
                        {product.title}
                    </Text>
                    {product.description && (
                        <Text size={14} style={[styles.productSubtitle, { color: colors.TEXT_SECONDARY }]}>
                            {product.description}
                        </Text>
                    )}
                </Block>
            </Block>
        </TouchableWithoutFeedback>
    );
}

// HOC to inject navigation prop from hook into component
const ProductWithNavigation = (props) => {
    const navigation = useNavigation();
    return <Product {...props} navigation={navigation} />;
};

export default ProductWithNavigation;

const styles = StyleSheet.create({
    product: {
        marginVertical: theme.SIZES.BASE,
        borderWidth: 0,
        minHeight: 140,
        borderRadius: 12,
        overflow: 'hidden',
    },
    productTitle: {
        flexWrap: 'wrap',
        paddingBottom: 8,
    },
    productSubtitle: {
        paddingTop: 4,
    },
    productDescription: {
        padding: theme.SIZES.BASE,
        justifyContent: 'center',
        flex: 1,
    },
    imageContainer: {
        elevation: 1,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        borderRadius: 3,
        marginHorizontal: theme.SIZES.BASE / 2,
        marginTop: -16,
    },
    horizontalImage: {
        height: '100%',
        width: '100%',
    },
    fullImage: {
        height: 215,
        width: width - theme.SIZES.BASE * 3,
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
});
