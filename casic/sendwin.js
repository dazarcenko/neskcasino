const ADMIN_ID = 1067205524;
app.post('/api/notify-admin', async (req, res) => {
    const { winAmount, userId, name } = req.body;
    
    // Бот отправляет сообщение админу
    await bot.telegram.sendMessage(
        ADMIN_ID, 
        `🚨 <b>КРУПНЫЙ ВЫИГРЫШ!</b>\n\nИгрок: ${name} (ID: <code>${userId}</code>)\nВыиграл: <b>${winAmount} спинов</b>!`, 
        { parse_mode: 'HTML' }
    );
    
    res.sendStatus(200);
});