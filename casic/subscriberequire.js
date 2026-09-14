// Добавь на Railway новую переменную CHANNEL_ID
// Ее значение должно быть числовым, например: -1001234567890
const CHANNEL_ID = process.env.CHANNEL_ID; 

try {
    // Проверка состоит ли пользователь в канале, используя числовой ID[cite: 1]
    const chatMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
    
    if (chatMember.status === 'member' || chatMember.status === 'administrator' || chatMember.status === 'creator') {
        // Пользователь подписан! Начисляем 5 спинов в БД[cite: 1]
        res.json(true);
    } else {
        // Не подписан[cite: 1]
        res.json(false);
    }
} catch (error) {
    // Если бот не является админом в канале или ID указан неверно, API выдаст ошибку
    console.error('Ошибка при проверке подписки:', error.description);
    res.json(false); 
}
