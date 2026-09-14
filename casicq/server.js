const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bot = new Telegraf(process.env.BOT_TOKEN); 
const WEB_APP_URL = process.env.WEB_APP_URL; 
// ОБЯЗАТЕЛЬНО: добавь в Railway переменную CHANNEL_ID (например: -1001234567890)
const CHANNEL_ID = process.env.CHANNEL_ID; 

// --- БАЗА ДАННЫХ В ПАМЯТИ ---
// Хранит спины пользователей. (В будущем можно заменить на SQLite/PostgreSQL)
const db = {}; 

// --- ЛОГИКА БОТА ---
bot.command('start', (ctx) => {
    ctx.reply(
        'Добро пожаловать в NeskShop Slots! 🎰\n\nЖми кнопку ниже, чтобы начать игру:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎰 ИГРАТЬ', WEB_APP_URL)
        ])
    );
});

// --- API: ПРОВЕРКА ПОДПИСКИ И ВЫДАЧА СПИНОВ ---
app.post('/api/user-data', async (req, res) => {
    const { userId } = req.body;

    // Создаем карточку юзера, если он зашел впервые
    if (!db[userId]) {
        db[userId] = { spins: 0, hasClaimedWelcome: false };
    }

    let isSubbed = false;

    // РЕАЛЬНАЯ проверка подписки
    try {
        if (CHANNEL_ID) {
            const member = await bot.telegram.getChatMember(CHANNEL_ID, userId);
            isSubbed = ['member', 'administrator', 'creator'].includes(member.status);
        } else {
            console.error("ОШИБКА: Не указан CHANNEL_ID в переменных Railway!");
        }
    } catch (e) {
        console.error(`Ошибка проверки подписки для ${userId}:`, e.description || e.message);
    }

    // Если подписан и еще не забирал стартовые спины — начисляем!
    if (isSubbed && !db[userId].hasClaimedWelcome) {
        db[userId].spins += 5;
        db[userId].hasClaimedWelcome = true;
    }

    // Возвращаем данные игроку
    res.json({
        isSubbed: isSubbed,
        spins: db[userId].spins
    });
});

// --- API: ЛОГИКА ВРАЩЕНИЯ СЛОТОВ ---
app.post('/api/spin', (req, res) => {
    const { userId } = req.body;

    // Проверяем, есть ли у юзера спины
    if (!db[userId] || db[userId].spins < 1) {
        return res.status(400).json({ error: 'Нет спинов!' });
    }

    // Списываем 1 спин из базы
    db[userId].spins -= 1;

    // Крутим рандом НА СЕРВЕРЕ (чтобы нельзя было взломать)
    const SYMBOLS = ['🛒', '🛍️', '📦', '⭐', 'N'];
    const getRandom = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const getDiff = (exc) => { let s; do { s = getRandom(); } while(s === exc); return s; };
    
    const roll = Math.random();
    let result = [];
    let winAmount = 0;

    if (roll < 0.02) {
        const sym = getRandom(); result = [sym, sym, sym]; winAmount = 10;
    } else if (roll < 0.32) {
        const s1 = getRandom(); result = [s1, s1, getDiff(s1)]; winAmount = 0;
    } else {
        const s1 = getRandom(); const s2 = getDiff(s1);
        let s3; do { s3 = getRandom(); } while(s3 === s1 || s3 === s2);
        result = [s1, s2, s3]; winAmount = 0;
    }

    // Начисляем выигрыш в базу
    db[userId].spins += winAmount;

    // Отправляем результат анимации на телефон
    res.json({
        result: result,
        winAmount: winAmount,
        spins: db[userId].spins
    });
});

// --- ЗАПУСК СЕРВЕРА ---
bot.launch().then(() => console.log('Бот успешно запущен!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
