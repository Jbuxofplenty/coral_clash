#!/usr/bin/env node
/**
 * add-free-trial-strings.js
 * Injects the `cards.freeTrial` locale block into every language JSON file.
 * Translated strings are provided directly; English is used as fallback for
 * any language that isn't explicitly listed.
 *
 * Usage: node scripts/add-free-trial-strings.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');

// ── Translations ────────────────────────────────────────────────────────────
const translations = {
    en: {
        gateTitle: "You've mastered the basics!",
        gateMessage:
            'Log in to continue playing Coral Clash and see how you rank globally against other players.',
        signIn: 'Sign In / Create Account',
        maybeLater: 'Maybe Later',
        limitedAccessTitle: 'Free Trial Limit Reached',
        limitedAccessMessage: "You've played your 3 free games. Sign in to keep playing!",
        pill1: 'Global Rankings',
        pill2: 'Play Online',
        pill3: 'Track Stats',
    },
    es: {
        gateTitle: '¡Ya dominas lo básico!',
        gateMessage:
            'Inicia sesión para seguir jugando a Coral Clash y ver cómo te clasificas globalmente.',
        signIn: 'Iniciar sesión / Crear cuenta',
        maybeLater: 'Quizás más tarde',
        limitedAccessTitle: 'Límite de prueba alcanzado',
        limitedAccessMessage: 'Has jugado tus 3 partidas gratuitas. ¡Inicia sesión para continuar!',
        pill1: 'Clasificación global',
        pill2: 'Jugar en línea',
        pill3: 'Ver estadísticas',
    },
    fr: {
        gateTitle: 'Vous maîtrisez les bases !',
        gateMessage:
            'Connectez-vous pour continuer à jouer à Coral Clash et voir votre classement mondial.',
        signIn: 'Se connecter / Créer un compte',
        maybeLater: 'Peut-être plus tard',
        limitedAccessTitle: "Limite d\u2019essai atteinte",
        limitedAccessMessage:
            'Vous avez joué vos 3 parties gratuites. Connectez-vous pour continuer !',
        pill1: 'Classement mondial',
        pill2: 'Jouer en ligne',
        pill3: 'Statistiques',
    },
    de: {
        gateTitle: 'Du hast die Grundlagen gemeistert!',
        gateMessage:
            'Melde dich an, um Coral Clash weiter zu spielen und dein globales Ranking zu sehen.',
        signIn: 'Anmelden / Konto erstellen',
        maybeLater: 'Vielleicht später',
        limitedAccessTitle: 'Testlimit erreicht',
        limitedAccessMessage:
            'Du hast deine 3 kostenlosen Spiele gespielt. Melde dich an, um weiterzuspielen!',
        pill1: 'Weltrangliste',
        pill2: 'Online spielen',
        pill3: 'Statistiken',
    },
    pt: {
        gateTitle: 'Você dominou o básico!',
        gateMessage:
            'Faça login para continuar jogando Coral Clash e ver sua classificação global.',
        signIn: 'Entrar / Criar conta',
        maybeLater: 'Talvez mais tarde',
        limitedAccessTitle: 'Limite de avaliação atingido',
        limitedAccessMessage:
            'Você jogou seus 3 jogos gratuitos. Faça login para continuar jogando!',
        pill1: 'Ranking global',
        pill2: 'Jogar online',
        pill3: 'Estatísticas',
    },
    ru: {
        gateTitle: 'Вы освоили основы!',
        gateMessage:
            'Войдите, чтобы продолжить играть в Coral Clash и увидеть свой глобальный рейтинг.',
        signIn: 'Войти / Создать аккаунт',
        maybeLater: 'Может быть позже',
        limitedAccessTitle: 'Лимит пробного периода исчерпан',
        limitedAccessMessage:
            'Вы сыграли 3 бесплатные игры. Войдите, чтобы продолжить!',
        pill1: 'Мировой рейтинг',
        pill2: 'Играть онлайн',
        pill3: 'Статистика',
    },
    ar: {
        gateTitle: 'لقد أتقنت الأساسيات!',
        gateMessage:
            'سجّل دخولك لمواصلة لعب Coral Clash ومعرفة ترتيبك على مستوى العالم.',
        signIn: 'تسجيل الدخول / إنشاء حساب',
        maybeLater: 'ربما لاحقاً',
        limitedAccessTitle: 'انتهى حد التجربة المجانية',
        limitedAccessMessage: 'لقد لعبت 3 ألعاب مجانية. سجّل دخولك للاستمرار!',
        pill1: 'ترتيب عالمي',
        pill2: 'العب أونلاين',
        pill3: 'الإحصائيات',
    },
    hi: {
        gateTitle: 'आपने बेसिक्स में महारत हासिल कर ली!',
        gateMessage:
            'Coral Clash खेलना जारी रखने और वैश्विक रैंकिंग देखने के लिए लॉग इन करें।',
        signIn: 'लॉग इन करें / खाता बनाएं',
        maybeLater: 'शायद बाद में',
        limitedAccessTitle: 'निःशुल्क परीक्षण सीमा पहुंच गई',
        limitedAccessMessage: 'आपने अपने 3 मुफ्त गेम खेल लिए। खेलते रहने के लिए साइन इन करें!',
        pill1: 'वैश्विक रैंकिंग',
        pill2: 'ऑनलाइन खेलें',
        pill3: 'आंकड़े देखें',
    },
    zh: {
        gateTitle: '你已掌握基础知识！',
        gateMessage: '登录以继续游玩 Coral Clash，并查看你在全球玩家中的排名。',
        signIn: '登录 / 创建账户',
        maybeLater: '也许以后',
        limitedAccessTitle: '免费试玩次数已用完',
        limitedAccessMessage: '你已玩完 3 场免费游戏。登录以继续游玩！',
        pill1: '全球排行榜',
        pill2: '在线对战',
        pill3: '查看统计',
    },
    id: {
        gateTitle: 'Kamu sudah menguasai dasar-dasarnya!',
        gateMessage:
            'Masuk untuk terus bermain Coral Clash dan lihat peringkatmu secara global.',
        signIn: 'Masuk / Buat Akun',
        maybeLater: 'Mungkin nanti',
        limitedAccessTitle: 'Batas uji coba tercapai',
        limitedAccessMessage: 'Kamu sudah memainkan 3 game gratis. Masuk untuk terus bermain!',
        pill1: 'Peringkat Global',
        pill2: 'Main Online',
        pill3: 'Statistik',
    },
    tr: {
        gateTitle: 'Temelleri öğrendiniz!',
        gateMessage:
            "Coral Clash oynamaya devam etmek ve küresel sıralamadaki yerinizi görmek için giriş yapın.",
        signIn: 'Giriş Yap / Hesap Oluştur',
        maybeLater: 'Belki daha sonra',
        limitedAccessTitle: 'Ücretsiz deneme limiti doldu',
        limitedAccessMessage:
            '3 ücretsiz oyununuzu oynadınız. Oynamaya devam etmek için giriş yapın!',
        pill1: 'Global Sıralama',
        pill2: 'Online Oyna',
        pill3: 'İstatistikler',
    },
    pl: {
        gateTitle: 'Opanowałeś podstawy!',
        gateMessage:
            'Zaloguj się, aby kontynuować grę w Coral Clash i zobaczyć swój globalny ranking.',
        signIn: 'Zaloguj się / Utwórz konto',
        maybeLater: 'Może później',
        limitedAccessTitle: 'Limit bezpłatnych gier osiągnięty',
        limitedAccessMessage:
            'Rozegrałeś 3 bezpłatne gry. Zaloguj się, aby kontynuować grę!',
        pill1: 'Ranking globalny',
        pill2: 'Graj online',
        pill3: 'Statystyki',
    },
    bn: {
        gateTitle: 'আপনি মূল বিষয়গুলো আয়ত্ত করেছেন!',
        gateMessage:
            'Coral Clash খেলতে চালিয়ে যেতে এবং বৈশ্বিক র‍্যাঙ্কিং দেখতে লগ ইন করুন।',
        signIn: 'লগ ইন করুন / অ্যাকাউন্ট তৈরি করুন',
        maybeLater: 'হয়তো পরে',
        limitedAccessTitle: 'বিনামূল্যে ট্রায়াল সীমা শেষ',
        limitedAccessMessage:
            'আপনি ৩টি বিনামূল্যে গেম খেলেছেন। চালিয়ে যেতে সাইন ইন করুন!',
        pill1: 'বৈশ্বিক র‍্যাঙ্কিং',
        pill2: 'অনলাইনে খেলুন',
        pill3: 'পরিসংখ্যান',
    },
    ur: {
        gateTitle: 'آپ نے بنیادی باتیں سیکھ لی ہیں!',
        gateMessage:
            'Coral Clash کھیلتے رہنے اور عالمی درجہ بندی دیکھنے کے لیے لاگ ان کریں۔',
        signIn: 'لاگ ان کریں / اکاؤنٹ بنائیں',
        maybeLater: 'شاید بعد میں',
        limitedAccessTitle: 'مفت آزمائشی حد ختم',
        limitedAccessMessage: 'آپ نے 3 مفت گیم کھیل لیے ہیں۔ کھیلتے رہنے کے لیے سائن ان کریں!',
        pill1: 'عالمی درجہ بندی',
        pill2: 'آن لائن کھیلیں',
        pill3: 'اعداد و شمار',
    },
    uz: {
        gateTitle: 'Siz asoslarni egallading!',
        gateMessage:
            "Coral Clash o'ynashni davom ettirish va global reytingingizni ko'rish uchun kirish qiling.",
        signIn: "Kirish / Hisob yaratish",
        maybeLater: "Keyinroq ehtimol",
        limitedAccessTitle: "Bepul sinov limiti tugadi",
        limitedAccessMessage:
            "Siz 3 ta bepul o'yin o'yndingiz. O'ynashni davom ettirish uchun kiring!",
        pill1: "Global reyting",
        pill2: "Onlayn o'ynash",
        pill3: "Statistika",
    },
    my: {
        gateTitle: 'သင် အခြေခံများကို ကျွမ်းကျင်ပြီ!',
        gateMessage:
            'Coral Clash ဆက်လက်ကစားရန်နှင့် ကမ္ဘာ့အဆင့်သတ်မှတ်ချက်ကို ကြည့်ရှုရန် လော့ဂ်အင်ဝင်ပါ။',
        signIn: 'လော့ဂ်အင်ဝင်ရန် / အကောင့်ဖွင့်ရန်',
        maybeLater: 'နောင်တမ်း ဖြစ်နိုင်သည်',
        limitedAccessTitle: 'အခမဲ့ စမ်းသပ်မှု ကန့်သတ်ချက် ပြည့်သွားပြီ',
        limitedAccessMessage:
            'သင် အခမဲ့ ဂိမ်း ၃ ခုကစားပြီးပြီ။ ဆက်လက်ကစားရန် ဝင်ရောက်ပါ!',
        pill1: 'ကမ္ဘာ့အဆင့်',
        pill2: 'အွန်လိုင်းကစားရန်',
        pill3: 'စာရင်းဇယားများ',
    },
};

// ── Inject into each locale file ─────────────────────────────────────────────
const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));

let updated = 0;
let skipped = 0;

for (const file of files) {
    const lang = path.basename(file, '.json');
    const filePath = path.join(LOCALES_DIR, file);

    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`  ✗ Could not parse ${file}:`, e.message);
        continue;
    }

    // Skip if already has freeTrial key
    if (data?.cards?.freeTrial) {
        console.log(`  ⏭  ${file} — already has freeTrial key, skipping`);
        skipped++;
        continue;
    }

    // Inject using the language's own translation, falling back to English
    const strings = translations[lang] ?? translations['en'];
    data.cards = data.cards ?? {};
    data.cards.freeTrial = strings;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    console.log(`  ✓ ${file} — ${lang in translations ? 'translated' : 'English fallback'}`);
    updated++;
}

console.log(`\nDone. ${updated} files updated, ${skipped} skipped.`);
