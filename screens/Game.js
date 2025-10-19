import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { Block } from 'galio-framework';
import Chess from '../components/ChessBoard';

const { width, height } = Dimensions.get('screen');

export default class Game extends React.Component {
    render() {
      return (
        <Block style={styles.game}>
            <Block flex center>
                <Chess />
            </Block>
        </Block>
      );
    }
  }
  
const styles = StyleSheet.create({
    game: {
        width: width,
        height: height 
    },
});
  