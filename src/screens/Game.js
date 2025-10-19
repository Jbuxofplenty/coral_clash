import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Block } from 'galio-framework';
import CoralClash from '../components/CoralClashBoard';

const { width, height } = Dimensions.get('screen');

export default class Game extends React.Component {
    render() {
        return (
            <LinearGradient
                colors={['#1e3c72', '#2a5298', '#7e8ba3']}
                style={styles.game}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <Block flex center>
                    <CoralClash />
                </Block>
            </LinearGradient>
        );
    }
}

const styles = StyleSheet.create({
    game: {
        width: width,
        height: height,
    },
});
