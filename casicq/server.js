const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(express.json());

// ВАЖНО: Сервер теперь сам раздает твою игру из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Бот берет токен из Railway Variables
const bot = new Telegraf(process.env.BOT_TOKEN); 
// Ссылка на твой Railway (ты добавишь её в Variables)
const WEB_APP_URL = process.env.WEB_APP_URL; 

// --- ЛОГИКА БОТА ---
bot.command('start', (ctx) => {
    ctx.reply(
        'Добро пожаловать в NeskShop Slots! 🎰\n\nЖми кнопку ниже, чтобы начать игру:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎰 ИГРАТЬ', WEB_APP_URL)
        ])
    );
});

// --- API ДЛЯ ПРОВЕРКИ ПОДПИСКИ ---
app.get('/api/check-sub', async (req, res) => {
    // В будущем тут будет реальная проверка. 
    // Пока стоит true, чтобы игра тебя пустила без ошибок.
    res.json(true); 
});

// --- ЗАПУСК ---
bot.launch().then(() => console.log('Бот успешно запущен!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));