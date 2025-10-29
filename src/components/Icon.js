import { createIconSetFromIcoMoon } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Icon } from 'galio-framework';
import React from 'react';

import GalioConfig from '../assets/fonts/galioExtra';
import GalioExtra from '../assets/fonts/galioExtra.ttf';
const IconGalioExtra = createIconSetFromIcoMoon(GalioConfig, 'GalioExtra');

export default class IconExtra extends React.Component {
    state = {
        fontLoaded: false,
    };

    async componentDidMount() {
        await Font.loadAsync({ GalioExtra: GalioExtra });
        this.setState({ fontLoaded: true });
    }

    render() {
        const { name, family, ...rest } = this.props;

        if (name && family && this.state.fontLoaded) {
            if (family === 'GalioExtra') {
                return <IconGalioExtra name={name} family={family} {...rest} />;
            }
            return <Icon name={name} family={family} {...rest} />;
        }

        return null;
    }
}
