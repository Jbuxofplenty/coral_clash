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
                card
                style={[
                    styles.product,
                    styles.shadow,
                    { backgroundColor: colors.CARD_BACKGROUND },
                    style,
                ]}
            >
                <Block center middle style={styles.imageContainer}>
                    {product.icon ? (
                        <View style={styles.iconWrapper}>
                            <Icon
                                name={product.icon}
                                family={product.iconFamily}
                                size={100}
                                color={colors.PRIMARY}
                            />
                        </View>
                    ) : (
                        <Image source={product.image} style={imageStyles} />
                    )}
                </Block>
                <Block style={styles.productDescription}>
                    <Text
                        size={20}
                        bold
                        style={[styles.productTitle, { color: colors.TEXT }]}
                        center
                    >
                        {product.title}
                    </Text>
                    {product.description && (
                        <Text
                            size={14}
                            style={[styles.productSubtitle, { color: colors.TEXT_SECONDARY }]}
                            center
                        >
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
        marginVertical: theme.SIZES.BASE * 1.5,
        borderWidth: 0,
        minHeight: width / 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    productTitle: {
        flexWrap: 'wrap',
        paddingBottom: 8,
    },
    productSubtitle: {
        paddingTop: 8,
    },
    productDescription: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE * 2,
        justifyContent: 'center',
    },
    imageContainer: {
        elevation: 1,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: theme.SIZES.BASE * 3,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    image: {
        borderRadius: 3,
        marginHorizontal: theme.SIZES.BASE / 2,
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
