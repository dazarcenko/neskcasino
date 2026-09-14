// Проверка состоит ли пользователь в канале
const chatMember = await bot.telegram.getChatMember('@your_channel_username', userId);
if (chatMember.status === 'member' || chatMember.status === 'administrator' || chatMember.status === 'creator') {
    // Пользователь подписан! Начисляем 5 спинов в БД
    res.json(true);
} else {
    // Не подписан
    res.json(false);
}