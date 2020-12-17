const cors = require('cors')
const express = require('express')
const app = express()
const port = process.env.PORT || 4999
const { MongoClient } = require('mongodb')
const Alpaca = require('@alpacahq/alpaca-trade-api')

const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(cors())

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

const url = 'mongodb+srv://user_harsha:9440554076@cluster0.brbe4.mongodb.net/<sample_airbnb>?retryWrites=true&w=majority&useNewUrlParser=true&useUnifiedTopology=true';

const client = new MongoClient(url);

const dbName = 'alinea'

const alpaca = new Alpaca({
    keyId: 'PKXZ51AYOYRE3QIH458T',
    secretKey: '6Jx6ojwmHfBWdgSfYcDJefgDcJT4dHnBQWC0qHtM',
    paper: true,
    usePolygon: false
})



// app.get('/api/getStocksData', (req,res) => {
//     let listOfStocks = ['FB','GOOGL','AAPL','AMZN','MSFT',]
//     let stocksData = []
    
//     let promises = listOfStocks.map(async stockName => {
//         let barset = await alpaca.getBars('day', stockName, {limit:1})
//         let aapl_bars = barset[stockName]
//         let data = aapl_bars[0]
//         stocksData.push({ 
//             stockName,
//             value: data.closePrice
//          })
//     })
    
//     Promise.all(promises).then(() => res.json(stocksData))
    
// })

app.get('/api/getAllDataFromEndpoint', async (req, res) => {
    
    const collectionName = 'allStocksData'

    async function run() {
        try {
            await client.connect()
            console.log("Connected to the mongo server")

            const col = client.db(dbName).collection(collectionName)

            let listOfStocks = ['FB','GOOGL','AAPL','AMZN','MSFT']            

            let stocksData = []

            
            let promises = listOfStocks.map(async stockName => {
                let barset = await alpaca.getBars('day', stockName, {limit:2})
                let stock_bars = barset[stockName]
                const week_open = stock_bars[0].openPrice
                const week_close = stock_bars.slice(-1)[0].closePrice
                // console.log(week_close, week_open,105)
                const value_change = Math.round((week_close-week_open)*10)/10
                const percent_change = Math.round((week_close - week_open) / week_open * 100,2)

                // let data = aapl_bars[0]
                stocksData.push({ 
                    stock: stockName,
                    openValue: week_open,
                    closedValue: week_close,
                    valueChange: value_change,
                    percentChange: percent_change
                })
            })
            //Inserting the data into mongo db
            Promise.all(promises).then(async () => {
                await col.insertMany([...stocksData])
                res.json(stocksData)})

            

        } catch(err) {
            console.log(err.stack)
        }
    }
    run().catch(console.dir)

})

app.get('/api/showData', async (req, res) => {

    await client.connect()

    const collectionName = 'allStocksData'

    const result = await client.db(dbName).collection(collectionName).find({}).toArray()

    res.json(result)
})

app.get('/api/getAllStocksData', async (req, res) => {

    let allStocksData = []

    const collectionName = 'completeListOfStocks'

    await client.connect()
    console.log("Connected to the mongo server")

    const col = client.db(dbName).collection(collectionName)

    const activeAssets = await alpaca.getAssets({
        status: 'active'
    })
    // Filter the assets down to just those on NASDAQ.
    const nasdaqAssets = activeAssets.filter(asset => asset.exchange == 'NASDAQ')
    // res.json(nasdaqAssets)

    let dataToBeAppended = nasdaqAssets.slice(0,100)

    let promises = dataToBeAppended.map(async stockName => {
        let barset = await alpaca.getBars('day', stockName.symbol, {limit:2})
        let stock_bars = barset[stockName.symbol]
        const week_open = stock_bars[0].openPrice
        const week_close = stock_bars.slice(-1)[0].closePrice
        // // console.log(week_close, week_open,105)
        const value_change = Math.round((week_close-week_open)*10)/10
        const percent_change = Math.round((week_close - week_open) / week_open * 100,2)

        allStocksData.push({ 
            stock: stockName.symbol,
            openValue: week_open,
            closedValue: week_close,
            valueChange: value_change,
            percentChange: percent_change
        })
    })

    //Inserting the data into mongo db
    Promise.all(promises).then(async () => {
        await col.insertMany([...allStocksData])
        res.json(allStocksData)})
})

app.get('/api/showSearchData', async (req, res) => {

    await client.connect()

    const collectionName = 'completeListOfStocks'

    const result = await client.db(dbName).collection(collectionName).find({}).toArray()

    res.json(result)
})




app.listen(port, () => {
    console.log("Connection established, app listening to ",port)
})