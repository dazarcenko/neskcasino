const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');

// Инициализация Express (Сервер)
const app = express();
app.use(cors()); // Разрешаем запросы с других сайтов
app.use(express.json());

// Инициализация Telegram Бота
// Railway подтянет токен из переменных (Variables)
const bot = new Telegraf(process.env.BOT_TOKEN); 

// Ссылка на твой Web App (замени в Railway Variables на ссылку, где лежит index.html)
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://твой-сайт.com'; 

// --- КОМАНДЫ БОТА ---
bot.command('start', (ctx) => {
    ctx.reply(
        'Добро пожаловать в NeskShop Slots! 🎰\n\nЖми кнопку ниже, чтобы начать игру:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎰 ИГРАТЬ', WEB_APP_URL)
        ])
    );
});

// --- API ДЛЯ ФРОНТЕНДА ---

// Эндпоинт проверки подписки
app.get('/api/check-sub', async (req, res) => {
    // В будущем здесь будет проверка через bot.telegram.getChatMember
    // Сейчас ставим заглушку true, чтобы игра сразу открывалась
    res.json(true); 
});

// --- ЗАПУСК ---

// Запуск бота
bot.launch().then(() => console.log('Бот успешно запущен!'));

// Запуск сервера Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Сервер работает на порту ${PORT}`);
});

// Остановка при крашах
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));