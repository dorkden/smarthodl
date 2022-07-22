const {Rebalance, start} = require("./rebalance");
const {Exchange} = require("./exchange");
const {logger} = require("./utils/logger");
const {sleep} = require("./utils/utils");
const config = require('../configs');

const bootstrap = async () => {

    const configs = config.pairs.map(el => {
        const {exchange} = config;
        return Object.assign(exchange, el);
    });

    const ex = new Exchange(config.exchange);
    const rebalance = new Rebalance(config);

    await ex.loadMarkets();

    while (true) {
        logger.info(`------ New Iteration ------`);
        await start(configs, ex, rebalance);
        // sleep for 10 minutes
        await sleep(600000);
    }
};

bootstrap();
