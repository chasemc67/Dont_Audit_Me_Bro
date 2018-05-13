//https://www.cryptocompare.com/api/#-api-data-histominute-
const https = require("https");
const btcPubKeys = require("./btcPubKeys").btcPubKeys;
const bchPubKeys = require("./bchPubKeys").bchPubKeys;
const ethPubKeys = require("./ethPubKeys").ethPubKeys;

const ethValueMultiplier = .000000000000000001; // api gives us trillions of an eth or whatever
const gasPriceMultiplier = .00000001;
const btcValueMultiplier = .00000001;

const exchangeCurrencies = ["BTC", "USD", "CAD"]; // there isn't support for changing this array yet when reading from api response;
var chain;


if (process.argv[2]) {
    chain = (process.argv[2].toUpperCase());
} else {
    chain = "ETH";
}

function getEthUrlForAddr(addr) {
    const ethApiKey = "5WU911P6VS8P4472M52Q1IGYGD2BS385HT";
    return `https://api.etherscan.io/api?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&sort=asc&ethApikey=${ethApiKey}`;
}

function getBtcUrlForAddr(addr) {
    return `https://api.blockchair.com/bitcoin/dashboards/address/${addr}`;
}

function getBchUrlForAddr(addr) {
    return `https://api.blockchair.com/bitcoin-cash/dashboards/address/${addr}`;
}
  
function getDataFromApi(url, callback) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                if (body.startsWith("<")) {
                    throw Error;
                    reject("Fail! Exceeded request limit");
                }
                resolve(JSON.parse(body));
            });
        });
        }
    );   
}

// Gets price for coin, in each currency in array: currencies
// Make sure your transaction has a timestamp
var getPriceAtTime = function (coin, currencies, timeStamp) {
    return new Promise((resolve, reject) => {
        const priceApi = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${coin.toUpperCase()}&tsyms=${currencies.join().toUpperCase()}&ts=${timeStamp}`;
        https.get(priceApi, res => {
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => {
                body += data;
            });
            res.on("end", () => {
                resolve(JSON.parse(body));
            });
        });
    });
}

function mapBlockChairApiResponseToTransactions(apiResponse, data) {
    // each transaction needs to generated two apiResponses. a buy and a sell
    
    // TODO the bought/sold logic here is probably wrong
    let valueMultiplier;
    if (chain === "BTC") {
        valueMultiplier = btcValueMultiplier;
    }

    let apiData = apiResponse.data[0];
    let transactions = [];
    transactions = transactions.concat({
        amountBought: parseInt(apiData.sum_value) * valueMultiplier,
        timeStamp: new Date(apiData.max_time_receiving).getTime() / 1000,
        date: apiData.max_time_receiving,
        amountSold: 0,
        pubKey: data.pubKey
    });


    if (apiData.sum_value_unspent === "0") {
        transactions = transactions.concat({
            amountSold: parseInt(apiData.sum_value) * valueMultiplier,
            timeStamp:  new Date(apiData.max_time_spending).getTime() / 1000,
            date: apiData.max_time_spending,
            amountBought: 0,
            pubKey: data.pubKey
        });
    } 

    return transactions;
}

function mapEthApiResponseToTransactions(response, data) {
    let responseTransactionsArray = []
    response.result.forEach(txn => {
        responseTransactionsArray = responseTransactionsArray.concat({
            pubKey: data.pubKey,
            txnIdHash: txn.hash,
            date: new Date(parseInt(txn.timeStamp) * 1000).toString(),
            timeStamp: txn.timeStamp,
            amountBought: (txn.to === txn.pubKey) ? parseInt(txn.value) * ethValueMultiplier : 0,
            amountSold: (txn.from === txn.pubKey) ? parseInt(txn.value) * ethValueMultiplier : 0
        });
    });

    return responseTransactionsArray;
}


// a testing function to see if tranasctions add up to what we think they should
var calculateEthBalanceFromTransactions = function(transactionsArray) {
    var currentBalance = 0;
    var transaction;
    var gasUsedxPrice = 0;
    for (var i=0; i < transactionsArray.length; i++) {
        transaction = transactionsArray[i];
        if (transaction.isError === "0"){
            gasUsedxPrice += parseInt(transaction.gasUsed) + parseInt(transaction.gasPrice)*ethValueMultiplier;
            if(transaction.to === transaction.pubKey) {
                currentBalance += parseInt(transaction.value);
            } else if (transaction.from === transaction.pubKey) {
                currentBalance -= parseInt(transaction.value);
            }
        }
    }

    console.log(`Eth balance: ${currentBalance*ethValueMultiplier - gasUsedxPrice*gasPriceMultiplier}`);
}




function getPricedTransactions (transactions) {
    return new Promise((resolve, reject) => {
        pricedTransactions = [];
        transactions.forEach((transaction, i, transactions) => {
            setTimeout(() => {
                console.log(`Getting prices for pubKey: ${transactions[i].pubKey}, [${i+1}/${transactions.length}]`);
                getPriceAtTime(chain, exchangeCurrencies, transaction.timeStamp).then(priceData => {
                    pricedTransactions.push(
                        Object.assign({}, 
                            transaction, 
                            {
                                priceOfBtcAtTime: priceData[Object.keys(priceData)[0]].BTC,
                                priceOfUsdAtTime: priceData[Object.keys(priceData)[0]].USD,
                                priceOfCadAtTime: priceData[Object.keys(priceData)[0]].CAD
                            }
                        )
                    );
                });
                if (i === transactions.length-1) {
                    resolve(pricedTransactions);
                }
            }, i*300);
        });
    });
}

function getFinalizedTransactions (chain) {
    var pubKeys; 
    var apiUrlGetter;
    var mapApiToTxns;

    switch(chain) {
        case "ETH":
            console.log("Starting with currency ETH");
            pubKeys = ethPubKeys;
            apiUrlGetter = getEthUrlForAddr;
            mapApiToTxns = mapEthApiResponseToTransactions;
            break;
        
        case "BCH":
            console.log("Starting with currency BCH");  
            pubKeys = bchPubKeys;   
            apiUrlGetter = getBchUrlForAddr;
            mapApiToTxns = mapBlockChairApiResponseToTransactions;
            break;
        case "BTC":
        default:
            console.log("Starting with currency BTC");
            pubKeys = btcPubKeys;
            apiUrlGetter = getBtcUrlForAddr;
            mapApiToTxns = mapBlockChairApiResponseToTransactions;
            break;
    }

    return new Promise((resolve, reject) => {
        var finalTxns = []
        pubKeys.forEach((key, i, keys) => {
            setTimeout(() => {
                console.log(`Getting data for pubKey: ${keys[i]}, [${i+1}/${keys.length}]`);
                getDataFromApi(apiUrlGetter(key)).then(apiResponse => {
                    // Find transaction fail flag for btc/bch
                    finalTxns = finalTxns.concat(mapApiToTxns(apiResponse, {pubKey: keys[i]}));
                    if (i === keys.length-1) {
                        getPricedTransactions(finalTxns).then(pricedTxns => {
                            resolve(pricedTxns.sort((txnA, txnB) => {
                                return (txnA - txnB);
                            }));
                        });        
                    }
                }).catch(error => {
                    console.log("Something broke");
                    return;
                });
            }, i * 200);
        });
    });
}


function main() {
    displayTitle();
    getFinalizedTransactions(chain).then(finalizedTxns => {
        console.log(finalizedTxns);
    });
}


function displayTitle() {
    console.log(`
        _  _   _ ___ ___ _____   _____   ___   ___  ___ ___ 
       /_\\| | | |   \\_ _|_   _| | __\\ \\ / /_\\ |   \\| __| _ \\
      / _ \\ |_| | |) | |  | |   | _| \\ V / _ \\| |) | _||   /
     /_/ \\_\\___/|___/___| |_|   |___| \\_/_/ \\_\\___/|___|_|_\\                                                   
    `);
    console.log("Donnie boy won't know what hit 'im");
    console.log("\n\n\n");
}

main();