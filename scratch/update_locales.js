const fs = require('fs');
const path = require('path');

const localesDir = '/Users/adamwinchell/Cursor/coral_clash/src/locales';

const translations = {
    "ar": {
        "stats": {
            "eloRating": "تصنيف إيلو",
            "provisional": "مؤقت",
            "ratedGames": "المباريات المصنفة",
            "eloDescription": "إيلو هو نظام تصنيف يستخدم لحساب مستويات المهارة النسبية للاعبين. يزداد تصنيفك عندما تفوز وينخفض عندما تخسر ضد لاعبين آخرين."
        },
        "leaderboard": {
            "title": "لوحة الصدارة المصنفة",
            "subtitle": "مركزك في الجوار",
            "loading": "جاري تحميل التصنيفات...",
            "noPlayers": "لا يوجد لاعبون مصنفون بعد",
            "yourRank": "ترتيبك: #{{rank}}",
            "you": "أنت"
        }
    },
    "bn": {
        "stats": {
            "eloRating": "ইলো রেটিং",
            "provisional": "অস্থায়ী",
            "ratedGames": "রেটেড গেম",
            "eloDescription": "ইলো হল একটি রেটিং সিস্টেম যা খেলোয়াড়দের আপেক্ষিক দক্ষতার মাত্রা গণনা করতে ব্যবহৃত হয়। আপনি অন্য খেলোয়াড়দের বিরুদ্ধে জিতলে আপনার রেটিং বাড়ে এবং হারলে কমে।"
        },
        "leaderboard": {
            "title": "র‍্যাঙ্কড লিডারবোর্ড",
            "subtitle": "এলাকায় আপনার অবস্থান",
            "loading": "র‍্যাঙ্কিং লোড হচ্ছে...",
            "noPlayers": "এখনও কোনো র‍্যাঙ্কড খেলোয়াড় নেই",
            "yourRank": "আপনার র‍্যাঙ্ক: #{{rank}}",
            "you": "আপনি"
        }
    },
    "de": {
        "stats": {
            "eloRating": "Elo-Zahl",
            "provisional": "Provisorisch",
            "ratedGames": "Gewertete Spiele",
            "eloDescription": "Elo ist ein Wertungssystem zur Berechnung des relativen Spielstärkeniveaus von Spielern. Deine Wertung steigt bei Siegen und sinkt bei Niederlagen gegen andere Spieler."
        },
        "leaderboard": {
            "title": "Rangliste",
            "subtitle": "Dein Platz in der Nachbarschaft",
            "loading": "Rangliste wird geladen...",
            "noPlayers": "Noch keine gewerteten Spieler",
            "yourRank": "Dein Rang: #{{rank}}",
            "you": "Du"
        }
    },
    "fr": {
        "stats": {
            "eloRating": "Classement Elo",
            "provisional": "Provisoire",
            "ratedGames": "Parties classées",
            "eloDescription": "Elo est un système de classement utilisé pour calculer les niveaux de compétence relatifs des joueurs. Votre classement augmente quand vous gagnez et diminue quand vous perdez contre d'autres joueurs."
        },
        "leaderboard": {
            "title": "Classement mondial",
            "subtitle": "Votre place dans le quartier",
            "loading": "Chargement du classement...",
            "noPlayers": "Pas encore de joueurs classés",
            "yourRank": "Votre rang : #{{rank}}",
            "you": "Vous"
        }
    },
    "hi": {
        "stats": {
            "eloRating": "एलो रेटिंग",
            "provisional": "अनंतिम",
            "ratedGames": "रेटेड गेम",
            "eloDescription": "एलो एक रेटिंग प्रणाली है जिसका उपयोग खिलाड़ियों के सापेक्ष कौशल स्तरों की गणना करने के लिए किया जाता है। जब आप अन्य खिलाड़ियों के खिलाफ जीतते हैं तो आपकी रेटिंग बढ़ती है और हारने पर कम हो जाती है।"
        },
        "leaderboard": {
            "title": "रैंक वाली लीडरबोर्ड",
            "subtitle": "पड़ोस में आपका स्थान",
            "loading": "रैंकिंग लोड हो रही है...",
            "noPlayers": "अभी तक कोई रैंक वाला खिलाड़ी नहीं है",
            "yourRank": "आपकी रैंक: #{{rank}}",
            "you": "आप"
        }
    },
    "id": {
        "stats": {
            "eloRating": "Peringkat Elo",
            "provisional": "Provisional",
            "ratedGames": "Permainan Berperingkat",
            "eloDescription": "Elo adalah sistem peringkat yang digunakan untuk menghitung tingkat keahlian relatif pemain. Peringkat Anda naik saat menang dan turun saat kalah melawan pemain lain."
        },
        "leaderboard": {
            "title": "Papan Peringkat",
            "subtitle": "Posisi Anda di lingkungan",
            "loading": "Memuat peringkat...",
            "noPlayers": "Belum ada pemain berperingkat",
            "yourRank": "Peringkat Anda: #{{rank}}",
            "you": "Anda"
        }
    },
    "my": {
        "stats": {
            "eloRating": "Elo အဆင့်သတ်မှတ်ချက်",
            "provisional": "ယာယီ",
            "ratedGames": "အဆင့်သတ်မှတ်ထားသော ပွဲစဉ်များ",
            "eloDescription": "Elo သည် ကစားသမားများ၏ ကျွမ်းကျင်မှုအဆင့်ကို တွက်ချက်ရန် အသုံးပြုသော အဆင့်သတ်မှတ်ချက်စနစ်ဖြစ်သည်။ သင်အခြားကစားသမားများနှင့်နိုင်လျှင် အဆင့်တက်ပြီး ရှုံးလျှင် အဆင့်ကျပါမည်။"
        },
        "leaderboard": {
            "title": "အဆင့်သတ်မှတ်ချက်ဇယား",
            "subtitle": "သင်၏ ရပ်ကွက်အတွင်း အဆင့်",
            "loading": "အဆင့်များတင်နေသည်...",
            "noPlayers": "အဆင့်သတ်မှတ်ထားသော ကစားသမား မရှိသေးပါ",
            "yourRank": "သင်၏အဆင့်: #{{rank}}",
            "you": "သင်"
        }
    },
    "pl": {
        "stats": {
            "eloRating": "Ranking Elo",
            "provisional": "Tymczasowy",
            "ratedGames": "Gry rankingowe",
            "eloDescription": "Elo to system rankingowy służący do obliczania względnego poziomu umiejętności graczy. Twój ranking rośnie, gdy wygrywasz, i spada, gdy przegrywasz z innymi graczami."
        },
        "leaderboard": {
            "title": "Ranking",
            "subtitle": "Twoje miejsce w sąsiedztwie",
            "loading": "Ładowanie rankingu...",
            "noPlayers": "Brak rankingowych graczy",
            "yourRank": "Twój ranking: #{{rank}}",
            "you": "Ty"
        }
    },
    "pt": {
        "stats": {
            "eloRating": "Classificação Elo",
            "provisional": "Provisório",
            "ratedGames": "Jogos ranqueados",
            "eloDescription": "Elo é um sistema de classificação usado para calcular os níveis de habilidade relativos dos jogadores. Sua classificação aumenta quando você ganha e diminui quando você perde contra outros jogadores."
        },
        "leaderboard": {
            "title": "Classificação",
            "subtitle": "Seu lugar na vizinhança",
            "loading": "Carregando classificações...",
            "noPlayers": "Ainda não há jogadores ranqueados",
            "yourRank": "Sua classificação: #{{rank}}",
            "you": "Você"
        }
    },
    "ru": {
        "stats": {
            "eloRating": "Рейтинг Эло",
            "provisional": "Временный",
            "ratedGames": "Рейтинговые игры",
            "eloDescription": "Эло — это система рейтинга, используемая для расчета относительного уровня мастерства игроков. Ваш рейтинг растет при победах и падает при поражениях в играх с другими игроками."
        },
        "leaderboard": {
            "title": "Таблица лидеров",
            "subtitle": "Ваше место в округе",
            "loading": "Загрузка рейтинга...",
            "noPlayers": "Рейтинговых игроков пока нет",
            "yourRank": "Ваш ранг: #{{rank}}",
            "you": "Вы"
        }
    },
    "tr": {
        "stats": {
            "eloRating": "Elo Puanı",
            "provisional": "Geçici",
            "ratedGames": "Dereceli Oyunlar",
            "eloDescription": "Elo, oyuncuların göreceli yetenek seviyelerini hesaplamak için kullanılan bir derecelendirme sistemidir. Diğer oyunculara karşı kazandığınızda puanınız artar, kaybettiğinizde düşer."
        },
        "leaderboard": {
            "title": "Sıralama",
            "subtitle": "Mahalledeki yeriniz",
            "loading": "Sıralama yükleniyor...",
            "noPlayers": "Henüz dereceli oyuncu yok",
            "yourRank": "Sıralamanız: #{{rank}}",
            "you": "Siz"
        }
    },
    "ur": {
        "stats": {
            "eloRating": "ایلو ریٹنگ",
            "provisional": "عارضی",
            "ratedGames": "ریٹڈ گیمز",
            "eloDescription": "ایلو ایک ریٹنگ سسٹم ہے جو کھلاڑیوں کی نسبتی مہارت کی سطحوں کا حساب لگانے کے لیے استعمال کیا جاتا ہے۔ جب آپ دوسرے کھلاڑیوں کے خلاف جیتتے ہیں تو آپ کی ریٹنگ بڑھتی ہے اور ہارنے پر کم ہو جاتی ہے۔"
        },
        "leaderboard": {
            "title": "رینکنگ ٹیبل",
            "subtitle": "علاقے میں آپ کا مقام",
            "loading": "رینکنگ لوڈ ہو رہی ہے...",
            "noPlayers": "ابھی تک کوئی رینکڈ کھلاڑی نہیں ہے",
            "yourRank": "آپ کا رینک: #{{rank}}",
            "you": "آپ"
        }
    },
    "uz": {
        "stats": {
            "eloRating": "Elo reytingi",
            "provisional": "Vaqtinchalik",
            "ratedGames": "Reytingli o'yinlar",
            "eloDescription": "Elo — o'yinchilarning nisbiy mahorat darajasini hisoblash uchun foydalaniladigan reyting tizimi. Boshqa o'yinchilarga qarshi g'alaba qozonganingizda reytingingiz oshadi, mag'lub bo'lganda esa tushadi."
        },
        "leaderboard": {
            "title": "Reyting jadvali",
            "subtitle": "Mahalladagi o'rningiz",
            "loading": "Reyting yuklanmoqda...",
            "noPlayers": "Reytingli o'yinchilar hali yo'q",
            "yourRank": "Sizning o'rningiz: #{{rank}}",
            "you": "Siz"
        }
    },
    "zh": {
        "stats": {
            "eloRating": "Elo 评分",
            "provisional": "暂定",
            "ratedGames": "计分赛局数",
            "eloDescription": "Elo 是一种用于计算玩家相对水平的评分系统。在与其他玩家的对战中获胜时评分会上升，失败时则会下降。"
        },
        "leaderboard": {
            "title": "排行榜",
            "subtitle": "你在社区中的排名",
            "loading": "正在加载排名...",
            "noPlayers": "暂无排名玩家",
            "yourRank": "你的排名：#{{rank}}",
            "you": "你"
        }
    }
};

Object.keys(translations).forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) return;

    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Update stats
    if (!content.stats) content.stats = {};
    Object.assign(content.stats, translations[lang].stats);

    // Update leaderboard
    if (!content.leaderboard) content.leaderboard = {};
    Object.assign(content.leaderboard, translations[lang].leaderboard);

    fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf8');
    console.log(`Updated ${lang}.json with actual translations`);
});
