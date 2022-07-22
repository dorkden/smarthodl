const {Telegraf} = require('telegraf');

class Telegram {
    telegraf = new Telegraf();

    constructor(config) {
        const {token} = config;
        this.telegraf = new Telegraf(token);
    }

    async senMessage(chatId, message) {
        await this.telegraf.telegram.sendMessage(chatId, message);
    }

    async launch() {
        this.telegraf.start((ctx) => ctx.reply('Welcome'));
        await this.telegraf.launch()
    }
}


module.exports = {
    Telegram
};
