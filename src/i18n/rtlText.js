import { Text, TextInput } from 'react-native';
import i18n from './config';

// Languages that use right-to-left script
const RTL_LANGUAGES = ['ur', 'ar', 'he', 'fa'];

/**
 * Check if a language code is RTL
 */
export function isRTLLanguage(languageCode) {
    return RTL_LANGUAGES.includes(languageCode);
}

/**
 * Monkey-patch Text.render to inject writingDirection into every Text component.
 * 
 * We can't use defaultProps because when a component sets its own `style` prop
 * (which virtually all do), defaultProps.style is overridden entirely.
 * 
 * By patching render, we prepend the RTL style to the style array so it applies
 * everywhere but can still be overridden by explicit writingDirection in component styles.
 */
const originalTextRender = Text.render;
Text.render = function (props, ref) {
    const direction = isRTLLanguage(i18n.language) ? 'rtl' : 'ltr';
    const rtlStyle = { writingDirection: direction };
    return originalTextRender.call(this, {
        ...props,
        style: [rtlStyle, props.style],
    }, ref);
};

/**
 * Same treatment for TextInput so typed text also flows RTL.
 */
const originalTextInputRender = TextInput.render;
TextInput.render = function (props, ref) {
    const direction = isRTLLanguage(i18n.language) ? 'rtl' : 'ltr';
    const rtlStyle = { writingDirection: direction };
    return originalTextInputRender.call(this, {
        ...props,
        style: [rtlStyle, props.style],
    }, ref);
};

console.log(`[RTL] Text-only RTL support initialized (language: "${i18n.language}")`);

export default { isRTLLanguage, RTL_LANGUAGES };
