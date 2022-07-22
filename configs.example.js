module.exports = {
    exchange: {
        subAccountName: '',
        password: '',
        apiName: '',
        apiPassphrase: '',
        apiKey: '',
        secret: '',
        exchangeId: 'kucoin',
        enableRateLimit: true,
        testMode: true,
        postOnly: true
    },
    pairs: [
        {
            symbol: 'ETH/USDT',
            conditionValue: 30,
            conditionType: 'FIXED',
            minDiffValue: 2,
            minDiffType: 'FIXED',
        }
    ]
}
