const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const bot = new Telegraf(process.env.BOT_TOKEN);

const WEB_APP_URL = process.env.WEB_APP_URL;
const CHANNEL_ID = process.env.CHANNEL_ID;

const ADMIN_ID = process.env.ADMIN_ID || '1067205524';

const db = {};


/* =========================================
   ПРИЗЫ
========================================= */

const PRIZE_NAMES = {
    'images/zhiza.jpg': 'ЖИЖА',
    'images/vape.jpg': 'ПОД-СИСТЕМА',
    'images/odnorazka.jpg': 'ОДНОРАЗКА',
    '⭐': 'СЕКРЕТНЫЙ БОКС',
    'N': 'ПРОМОКОД'
};


/* =========================================
   СИМВОЛЫ БАРАБАНА
========================================= */

const SYMBOLS = [
    'images/zhiza.jpg',
    'images/vape.jpg',
    'images/odnorazka.jpg',
    '⭐',
    'N'
];


/* =========================================
   СЛУЧАЙНЫЙ СИМВОЛ
========================================= */

const getRandom = () => {
    return SYMBOLS[
        Math.floor(Math.random() * SYMBOLS.length)
    ];
};


/* =========================================
   ДРУГОЙ СИМВОЛ
========================================= */

const getDiff = (exc) => {

    let symbol;

    do {
        symbol = getRandom();
    } while (symbol === exc);

    return symbol;
};


/* =========================================
   START БОТА
========================================= */

bot.start(async (ctx) => {
    const userId = String(ctx.from.id);

    // Создаём пользователя, если его ещё нет
    if (!db[userId]) {
        db[userId] = {
            spins: 0,
            hasClaimedWelcome: false,
            referredBy: null,
            referrals: 0
        };
    }

    // Получаем параметр после /start
    // Например: /start 123456789
    const startPayload = ctx.startPayload;

    if (startPayload) {
        const referrerId = String(startPayload);

        // Нельзя пригласить самого себя
        if (referrerId !== userId) {

            // Проверяем, что пригласивший существует
            if (!db[referrerId]) {
                db[referrerId] = {
                    spins: 0,
                    hasClaimedWelcome: false,
                    referredBy: null,
                    referrals: 0
                };
            }

            // Начисляем только один раз
            if (!db[userId].referredBy) {

                db[userId].referredBy = referrerId;

                // +3 спина пригласившему
                db[referrerId].spins += 3;

                db[referrerId].referrals += 1;

                console.log(
                    `РЕФЕРАЛ: ${referrerId} пригласил ${userId}. +3 спина`
                );

                // Уведомляем пригласившего
                try {
                    await bot.telegram.sendMessage(
                        referrerId,
                        `🎉 По твоей ссылке зашёл новый пользователь!\n\n` +
                        `👤 ${ctx.from.first_name || 'Новый игрок'}\n` +
                        `🎰 Тебе начислено +3 спина!`
                    );
                } catch (err) {
                    console.error(
                        'Не удалось отправить уведомление рефереру:',
                        err.description || err.message
                    );
                }
            }
        }
    }

    await ctx.reply(
        'Добро пожаловать в NeskShop Slots! 🎰\n\n' +
        'Жми кнопку ниже, чтобы начать игру:',
        Markup.inlineKeyboard([
            Markup.button.webApp(
                '🎰 ИГРАТЬ',
                WEB_APP_URL
            )
        ])
    );
});

/* =========================================
   ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
========================================= */

app.post('/api/user-data', async (req, res) => {

    const { userId } = req.body;


    if (!db[userId]) {

        db[userId] = {
            spins: 0,
            hasClaimedWelcome: false
        };

    }


    let isSubbed = false;


    try {

        if (CHANNEL_ID) {

            const member =
                await bot.telegram.getChatMember(
                    CHANNEL_ID,
                    userId
                );


            isSubbed =
                [
                    'member',
                    'administrator',
                    'creator'
                ].includes(member.status);

        }

    } catch (e) {

        console.error(
            `Ошибка проверки подписки для ${userId}:`,
            e.description || e.message
        );

    }


    /*
     * Выдаем стартовые 5 спинов
     */

    if (
        isSubbed &&
        !db[userId].hasClaimedWelcome
    ) {

        db[userId].spins += 5;

        db[userId].hasClaimedWelcome = true;

    }


    res.json({

        isSubbed: isSubbed,

        spins: db[userId].spins

    });

});


/* =========================================
   SPIN
========================================= */

app.post('/api/spin', async (req, res) => {

    const {
        userId,
        firstName
    } = req.body;


    /* -----------------------------------------
       ПРОВЕРКА СПИНОВ
    ----------------------------------------- */

    if (
        !db[userId] ||
        db[userId].spins < 1
    ) {

        return res.status(400).json({
            error: 'Нет спинов!'
        });

    }


    /*
     * Списываем один спин
     */

    db[userId].spins -= 1;


    /* -----------------------------------------
       РЕЗУЛЬТАТ
    ----------------------------------------- */

    const roll = Math.random();

    let result = [];

    let winAmount = 0;

    let prizeName = null;


    /* =========================================
       ДЖЕКПОТ — 2%
    ========================================= */

    if (roll < 0.02) {

        /*
         * Три одинаковых символа
         */

        const symbol = getRandom();

        result = [
            symbol,
            symbol,
            symbol
        ];


        /*
         * +10 спинов
         */

        winAmount = 10;


        /*
         * Название приза
         */

        prizeName =
            PRIZE_NAMES[symbol] || 'ПРИЗ';


        /* -----------------------------------------
           УВЕДОМЛЕНИЕ АДМИНУ
        ----------------------------------------- */

        try {

            await bot.telegram.sendMessage(

                ADMIN_ID,

                `🚨 <b>НОВЫЙ ВЫИГРЫШ!</b>\n\n` +

                `👤 Игрок: ${firstName} ` +
                `(ID: <code>${userId}</code>)\n` +

                `🎁 Приз: <b>${prizeName}</b>\n` +

                `🎰 Комбинация: 3x ${symbol}`,

                {
                    parse_mode: 'HTML'
                }

            );

        } catch (err) {

            console.error(
                'Ошибка при отправке сообщения админу:',
                err.description || err.message
            );

        }

    }


    /* =========================================
       ДВА ОДИНАКОВЫХ — 30%
    ========================================= */

    else if (roll < 0.32) {

        const symbol1 = getRandom();

        const symbol2 = symbol1;

        const symbol3 =
            getDiff(symbol1);


        result = [
            symbol1,
            symbol2,
            symbol3
        ];

        winAmount = 0;

    }


    /* =========================================
       ОБЫЧНЫЙ ПРОИГРЫШ
    ========================================= */

    else {

        const symbol1 =
            getRandom();


        const symbol2 =
            getDiff(symbol1);


        let symbol3;


        do {

            symbol3 =
                getRandom();

        } while (
            symbol3 === symbol1 ||
            symbol3 === symbol2
        );


        result = [
            symbol1,
            symbol2,
            symbol3
        ];


        winAmount = 0;

    }


    /* =========================================
       ДОБАВЛЯЕМ ВЫИГРАННЫЕ СПИНЫ
    ========================================= */

    db[userId].spins += winAmount;


    /* =========================================
       ОТВЕТ MINI APP
    ========================================= */

    res.json({

        result: result,

        winAmount: winAmount,

        prizeName: prizeName,

        spins: db[userId].spins

    });

});


/* =========================================
   ЗАПУСК БОТА
========================================= */

bot.launch()
    .then(() => {
        console.log('Бот успешно запущен!');
    })
    .catch((err) => {
        console.error(
            'Ошибка запуска бота:',
            err
        );
    });


/* =========================================
   SERVER
========================================= */

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {
        console.log(
            `Сервер работает на порту ${PORT}`
        );
    }
);


/* =========================================
   ЗАВЕРШЕНИЕ
========================================= */

process.once(
    'SIGINT',
    () => bot.stop('SIGINT')
);

process.once(
    'SIGTERM',
    () => bot.stop('SIGTERM')
);
