const { Telegraf, Markup } = require('telegraf');

// Замени на токен от BotFather
const bot = new Telegraf(process.env.BOT_TOKEN);
// Замени на HTTPS-ссылку, куда ты залил index.html
const WEB_APP_URL = 'neskcasino-production.up.railway.app'; 

bot.command('start', (ctx) => {
    ctx.reply(
        'Запускай слоты по кнопке ниже:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎰 Играть', WEB_APP_URL)
        ])
    );
});

bot.launch();
