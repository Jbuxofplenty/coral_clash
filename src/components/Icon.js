import { createIconSetFromIcoMoon } from '@expo/vector-icons';
import { Icon } from 'galio-framework';
import React from 'react';

import GalioConfig from '../assets/fonts/galioExtra';
const IconGalioExtra = createIconSetFromIcoMoon(GalioConfig, 'GalioExtra');

export default function IconExtra(props) {
    const { name, family, ...rest } = props;

    if (name && family) {
        if (family === 'GalioExtra') {
            return <IconGalioExtra name={name} family={family} {...rest} />;
        }
        return <Icon name={name} family={family} {...rest} />;
    }

    return null;
}
