// Default profile icons (ocean themed)
export const DEFAULT_AVATARS = {
    dolphin: require('../assets/images/pieces/transparent/dolphin.png'),
    octopus: require('../assets/images/pieces/transparent/octopus.png'),
    whale: require('../assets/images/pieces/transparent/whale.png'),
    turtle: require('../assets/images/pieces/transparent/turtle.png'),
    crab: require('../assets/images/pieces/transparent/crab.png'),
    puffer: require('../assets/images/pieces/transparent/puffer.png'),
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
