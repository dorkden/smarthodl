const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const getDb = (symbol) => {
    const fileName = symbol.replace('/', '');
    const adapter = new FileSync(`db/${fileName}.json`)
    return low(adapter)
}

module.exports = {
    getDb
}
