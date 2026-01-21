import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');

const CustomSplashScreen = () => {
    return (
        <View style={styles.container}>
            <Image
                source={require('../assets/images/splash.png')}
                style={styles.splash}
                resizeMode="contain"
            />
            <Image
                source={require('../assets/images/igrs.png')}
                style={styles.igrs}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#2a5298',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        elevation: 10, // For Android
    },
    splash: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    igrs: {
        position: 'absolute',
        bottom: 60,
        width: width * 0.25,
        height: 100,
    },
});

export default CustomSplashScreen;
