const mongoose = require('mongoose')
// const { db: { host, name, port } } = require('../config/config.mongodb')
// const connectionString = `mongodb://${host}:${port}/${name}`
const connectionString = process.env.MONGO_URI
console.log(`Connection String:`, connectionString)
const { countConnect } = require('../helpers/check.connect')

class Database {
    constructor() {
        this.connect()
    }

    connect(type = 'mongodb') {
        // dev
        if (1 === 1) {
            mongoose.set("debug", true)
            mongoose.set('debug', { color: true })
        }
        mongoose.connect(connectionString, {
            maxPoolSize: 50
        }).then(_ => {
            console.log(
                `Connected Mongodb Success`,
                countConnect()
            )
        }).catch(err => console.log(`Error Connect!`))
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database()
        }
        return Database.instance
    }

}

const instanceMongodb = Database.getInstance()

module.exports = instanceMongodb

