const ccxt = require('ccxt')
const {sleep} = require('./utils/utils')
const {logger} = require('./utils/logger')

class Exchange {
    symbol = '';

    constructor(config) {
        const {
            secret,
            apiKey,
            apiPassphrase,
            password,
            exchangeId,
            timeFrame,
            postOnly,
            testMode,
        } = config

        const exchangeClass = ccxt[exchangeId]

        let extraConfig = {}

        if (apiPassphrase || password) {
            extraConfig.password = apiPassphrase || password
        }

        this.ex = new exchangeClass({
            apiKey,
            secret,
            timeout: 30000,
            enableRateLimit: true,
            ...extraConfig
        })

        if (testMode){
            this.ex.setSandboxMode (true)
        }

        this.postOnly = postOnly
        this.timeFrame = timeFrame
    }


    async setSymbol(symbol) {
        this.symbol = symbol;
    }

    async getBalance() {
        return await this.request(this.ex.fetchBalance)
    }

    async loadMarkets() {
        await this.request(this.ex.loadMarkets)
    }

    async getLastPrice() {
        const ticker = await this.request(this.ex.fetchTicker, [this.symbol])
        return ticker.last
    }

    async getOrderBook() {
        return await this.request(this.ex.fetchOrderBook, [this.symbol])
    }

    async getMarket() {
        const markets = this.ex.markets
        return markets[this.symbol]
    }

    async decimalToPrecision(decimal, precisionType) {

        const market = await this.getMarket()

        // logger.debug(`market: ${JSON.stringify(market)}`)
        // logger.debug(`market.precision[precisionType]: ${JSON.stringify(market.precision[precisionType])}`)
        // logger.debug(`this.ex.precisionMode: ${JSON.stringify(this.ex.precisionMode)}`)

        const precision = ccxt.decimalToPrecision(
            decimal,
            precisionType === 'amount' ? ccxt.TRUNCATE : ccxt.ROUND,
            market.precision[precisionType],
            this.ex.precisionMode
        )
        // logger.debug(`precision: ${JSON.stringify(precision)}`)

        return parseFloat(precision)
    }

    async createOrder(side, amount, price) {
        const params = {postOnly: !!this.postOnly}
        let order = await this.request(this.ex.createOrder, [this.symbol, 'limit', side, amount, price, params])
        order = await this.fetchOrder(order.id)

        // logger.debug(`createOrder: ${JSON.stringify(order)}`)
        return order
    }

    async fetchOrder(id) {
        // logger.debug(`fetchOrder: ${JSON.stringify(order)}`)
        return await this.request(this.ex.fetchOrder, [id, this.symbol])
    }

    async cancelOrder(id) {
        logger.debug(`cancel order: ${JSON.stringify(id)}`)
        const order = await this.request(this.ex.cancelOrder, [id])
        logger.debug(`order: ${JSON.stringify(order, null, 4)}`)
    }

    async fetchBalance() {
        const balance = await this.request(this.ex.fetchBalance)
        delete balance.info
        const pairs = this.symbol.split('/')
        const baseCurrency = pairs[0]
        const quoteCurrency = pairs[1]
        return {
            free: {
                [baseCurrency]: balance.free[baseCurrency] || 0,
                [quoteCurrency]: balance.free[quoteCurrency] || 0
            },
            used: {
                [baseCurrency]: balance.used[baseCurrency] || 0,
                [quoteCurrency]: balance.used[quoteCurrency] || 0
            },
            total: {
                [baseCurrency]: balance.total[baseCurrency] || 0,
                [quoteCurrency]: balance.total[quoteCurrency] || 0
            }
        }
    }

    async fetchCandles(timeFrame) {
        const res = await this.request(this.ex.fetchOHLCV, [this.symbol, timeFrame || this.timeFrame, undefined, 200])
        const candles = res.map(ohlcv => ({
            timestamp: ohlcv[0],
            open: ohlcv[1],
            high: ohlcv[2],
            low: ohlcv[3],
            close: ohlcv[4],
            volume: ohlcv[5]
        }))
        // newest candle is last in list
        // console.log(candles[candles.length-1])
        // console.log(candles[candles.length-2])
        // console.log(candles[candles.length-3])

        // Remove current candle
        candles.pop()

        return candles;
    }

    async retry(action, args, limit, attempt) {
        logger.warn(`An exchange error occurred, retrying in ${attempt} second(s) (${attempt}. attempt)`)
        let secondsPassed = 0
        let timePassedStr = ''
        while (secondsPassed < attempt) {
            await sleep(1000)
            secondsPassed += 1
            timePassedStr = `${secondsPassed} second(s) has passed`
            logger.warn(timePassedStr)
        }

        try {
            return await this.ex[action.name](...args)
        } catch (e) {
            if (e instanceof ccxt.ExchangeError || e instanceof ccxt.NetworkError) {
                if (limit === attempt) {
                    logger.error(`Max retry reached (${limit} retries): ${action.name} (${args.join(',')}) | ${e.message}`)
                    process.exit(1)
                }
                attempt += 1
                return await this.retry(action, args, limit, attempt)
            } else {
                logger.error(`An unexpected error occurred: retry | ${action.name} (${args.join(',')})`)
                process.exit(1)
            }

        }
    }

    async request(action, args = []) {
        try {
            logger.info(`Calling: ${action.name} (${args.join(',')})`)
            return await this.ex[action.name](...args)
        } catch (e) {
            if (e instanceof ccxt.NetworkError) {
                logger.error(`NetworkError: ${action.name} (${args.join(',')}) | ${e.message}`)
                // return await this.retry(action, args, 300, 1)
            } else if (e instanceof ccxt.ExchangeError) {
                logger.error(`ExchangeError: ${action.name} (${args.join(',')}) | ${e.message}`)
                // return await this.retry(action, args, 300, 1)
                // process.exit(1)
            } else {
                logger.error(`An unexpected error occurred: request | ${action.name} (${args.join(',')}) | ${e}`)
                process.exit(1)
            }
        }
    }
}


module.exports = {
    Exchange
}
