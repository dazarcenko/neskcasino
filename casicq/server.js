const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bot = new Telegraf(process.env.BOT_TOKEN); 
const WEB_APP_URL = process.env.WEB_APP_URL; 
const CHANNEL_ID = process.env.CHANNEL_ID; 

// Твой ID администратора для получения уведомлений о выигрышах
const ADMIN_ID = process.env.ADMIN_ID || '1067205524'; 

const db = {}; 

// Словарь призов для сервера
const PRIZE_NAMES = {
    '🛒': 'ЖИЖА',
    '🛍️': 'ПОД-СИСТЕМА',
    '📦': 'ОДНОРАЗКА',
    '⭐': 'СЕКРЕТНЫЙ БОКС',
    'N': 'ПРОМОКОД'
};

bot.command('start', (ctx) => {
    ctx.reply(
        'Добро пожаловать в NeskShop Slots! 🎰\n\nЖми кнопку ниже, чтобы начать игру:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎰 ИГРАТЬ', WEB_APP_URL)
        ])
    );
});

app.post('/api/user-data', async (req, res) => {
    const { userId } = req.body;
    if (!db[userId]) {
        db[userId] = { spins: 0, hasClaimedWelcome: false };
    }

    let isSubbed = false;
    try {
        if (CHANNEL_ID) {
            const member = await bot.telegram.getChatMember(CHANNEL_ID, userId);
            isSubbed = ['member', 'administrator', 'creator'].includes(member.status);
        }
    } catch (e) {
        console.error(`Ошибка проверки подписки для ${userId}:`, e.description || e.message);
    }

    if (isSubbed && !db[userId].hasClaimedWelcome) {
        db[userId].spins += 5;
        db[userId].hasClaimedWelcome = true;
    }

    res.json({ isSubbed: isSubbed, spins: db[userId].spins });
});

app.post('/api/spin', async (req, res) => {
    const { userId, firstName } = req.body;

    if (!db[userId] || db[userId].spins < 1) {
        return res.status(400).json({ error: 'Нет спинов!' });
    }

    db[userId].spins -= 1;

    const SYMBOLS = ['🛒', '🛍️', '📦', '⭐', 'N'];
    const getRandom = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const getDiff = (exc) => { let s; do { s = getRandom(); } while(s === exc); return s; };
    
    const roll = Math.random();
    let result = [];
    let winAmount = 0;
    let prizeName = null;

    if (roll < 0.02) {
        // ДЖЕКПОТ (3 одинаковых)
        const sym = getRandom(); 
        result = [sym, sym, sym]; 
        winAmount = 10; // даем еще 10 бонусных спинов сверху
        prizeName = PRIZE_NAMES[sym]; // Определяем, что за товар выпал

        // ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ АДМИНУ
        try {
            await bot.telegram.sendMessage(
                ADMIN_ID,
                `🚨 <b>НОВЫЙ ВЫИГРЫШ!</b>\n\n👤 Игрок: ${firstName} (ID: <code>${userId}</code>)\n🎁 Приз: <b>${prizeName}</b>\n🎰 Комбинация: 3x ${sym}`,
                { parse_mode: 'HTML' }
            );
        } catch (err) {
            console.error("Ошибка при отправке сообщения админу:", err.description);
        }

    } else if (roll < 0.32) {
        const s1 = getRandom(); result = [s1, s1, getDiff(s1)]; winAmount = 0;
    } else {
        const s1 = getRandom(); const s2 = getDiff(s1);
        let s3; do { s3 = getRandom(); } while(s3 === s1 || s3 === s2);
        result = [s1, s2, s3]; winAmount = 0;
    }

    db[userId].spins += winAmount;

    res.json({
        result: result,
        winAmount: winAmount,
        prizeName: prizeName, // Передаем название приза на фронтенд
        spins: db[userId].spins
    });
});

bot.launch().then(() => console.log('Бот успешно запущен!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер работает на порту ${PORT}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));