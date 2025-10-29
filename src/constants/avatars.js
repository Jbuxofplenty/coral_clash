// Default profile icons (ocean themed)
import crab from '../assets/images/pieces/transparent/crab.png';
import dolphin from '../assets/images/pieces/transparent/dolphin.png';
import octopus from '../assets/images/pieces/transparent/octopus.png';
import puffer from '../assets/images/pieces/transparent/puffer.png';
import turtle from '../assets/images/pieces/transparent/turtle.png';
import whale from '../assets/images/pieces/transparent/whale.png';

export const DEFAULT_AVATARS = {
    dolphin,
    octopus,
    whale,
    turtle,
    crab,
    puffer,
};

export const AVATAR_KEYS = Object.keys(DEFAULT_AVATARS);
export const DEFAULT_AVATAR_NAME = 'dolphin';

/**
 * Get a random avatar key for new users
 * @returns {string} Random avatar key
 */
export const getRandomAvatarKey = () => {
    const randomIndex = Math.floor(Math.random() * AVATAR_KEYS.length);
    return AVATAR_KEYS[randomIndex];
};
