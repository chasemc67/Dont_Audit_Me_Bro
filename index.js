//https://www.cryptocompare.com/api/#-api-data-histominute-
const https = require("https");
const btcPubKeys = require("./btcPubKeys").btcPubKeys;
const bchPubKeys = require("./bchPubKeys").bchPubKeys;
const ethPubKeys = require("./ethPubKeys").ethPubKeys;

const ethValueMultiplier = .000000000000000001; // api gives us trillions of an eth or whatever
const gasPriceMultiplier = .00000001;

const btcValueMultiplier = .00000001;

const exchangeCurrencies = ["BTC", "USD", "CAD"];
var currencyFlag;


if (process.argv[2]) {
    currencyFlag = (process.argv[2]);
} else {
    currencyFlag = "btc";
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
    return new Promise(
        function (resolve, reject) {
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
var getPriceAtTime = function (coin, currencies) {
    return new Promise((resolve, reject) => {
        const priceApi = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=${coin.toUpperCase()}&tsyms=${currencies.join().toUpperCase()}&ts=${transaction.timeStamp}`;
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
        console.log("starting");
        console.log(`Compiling data for ${transactions.length} transactions`);
        pricedTransactions = [];
        transactions.forEach((transaction, i, transactions) => {
            setTimeout(() => {
                console.log(`Transaction: ${i+1}`);
                getPriceAtTime(transaction, exchangeCurrencies).then(priceData => {
                    pricedTransactions.push(
                        Object.assign({}, 
                            transaction, 
                            {
                                priceInBtcAtTime: response.btc,
                                priceInUsdAtTime: response.usd,
                                priceInCadAtTime: response.cad
                            }
                        )
                    );
                });
                if (i === transactions.length-1) {
                    resolve(pricedTransactions);
                }
            }, i*100);
        });
    });
}

function mapBlockChairApiResponseToTransactions(responseData, data) {
    // each transaction needs to generated two responseDatas. a buy and a sell
    if (responseData.sum_value_unspent === "0") {
        return ([{
            amountBought: parseInt(responseData.sum_value),
            timeStamp: new Date(xresponseData.max_time_receiving).getTime() / 1000,
            amountSold: 0,
            pubKey: data.pubKey
        }, {
            amountSold: parseInt(responseData.sum_value),
            timeStamp:  new Date(responseData.max_time_spending).getTime() / 1000,
            amountBought: 0,
            pubKey: data.pubKey
        }]);
    } else {
        return ([{
            amountBought: parseInt(responseData.sum_value),
            timeStamp: new Date(responseData.max_time_receiving).getTime() / 1000,
            amountSold: 0,
            pubKey: data.pubKey
        }]);
    }
}

function mapEthToTransactions(response, data) {
    return({
        txnIdHash: response.transaction.hash,
        date: new Date(parseInt(response.transaction.timeStamp) * 1000).toString(),
        timeStamp: response.transaction.timeStamp,
        amountBought: (response.transaction.to === response.transaction.pubKey) ? parseInt(response.transaction.value) * ethValueMultiplier : 0,
        amountSold: (response.transaction.from === response.transaction.pubKey) ? parseInt(response.transaction.value) * ethValueMultiplier : 0,
        priceInBtcAtTime: response.price.ETH.BTC,
        priceInUsdAtTime: response.price.ETH.USD,
        priceInCadAtTime: response.price.ETH.CAD
    })
}

//Eth
// var ethTxns = []
// ethPubKeys.forEach((key, i, keys) => {
//     setTimeout(() => {
//         getDataFromApi(getEthUrlForAddr(key)).then(response => {
//             let transactions = response.result.filter((transaction) => {return transaction.isError === "0"});
//             transactions = transactions.map(transaction => {
//                 transaction.pubKey = keys[i];
//                 return transaction;
//             });
//             ethTxns = ethTxns.concat(response.result.filter((transaction) => {return transaction.isError === "0"}));    
//             if (i === keys.length-1) {
//                 getPrices(ethTxns);        
//                 //calculateBalanceFromTransactions(ethTxns);        
//             }
//         }).catch(error => {
//             console.log("Something broke");
//             return;
//         });
//     }, i * 200);
// });

var btcTxns = []
btcPubKeys.forEach((key, i, keys) => {
    setTimeout(() => {
        getDataFromApi(getBtcUrlForAddr(key)).then(response => {
            // Find transaction fail flag for btc/bch
            let addrData = response.data[0];
            btcTxns = btcTxns.concat(mapBlockChairApiResponseToTransactions(addrData, {pubKey: keys[i]}));
            if (i === keys.length-1) {
                getPricedTransactions(btcTxns).then(response => {
                    console.log(response);
                });        
            }
        }).catch(error => {
            console.log("Something broke");
            return;
        });
    }, i * 200);
});


// const key = ethPubKeys[5]
// getDataFromApi(getEthUrlForAddr(key)).then(response => {
//     let transactions = response.result.filter((transaction) => {return transaction.isError === "0"});
//     transactions = transactions.map(transaction => {
//         transaction.pubKey = key;
//         return transaction;
//     });
//     ethereumTransactions = ethereumTransactions.concat(response.result.filter((transaction) => {return transaction.isError === "0"}));    
//     calculateBalanceFromTransactions(ethereumTransactions);        
// });