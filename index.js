//https://www.cryptocompare.com/api/#-api-data-histominute-

const https = require("https");
const btcPubKeys = require("./btcPubKeys").btcPubKeys;
const bchPubKeys = require("./bchPubKeys").bchPubKeys;
const ethPubKeys = require("./ethPubKeys").ethPubKeys;

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


var Prices = [];
  
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


var calculateBalanceFromTransactions = function(transactionsArray, ethPublicAddress) {
    var currentBalance = 0;
    var transaction;
    var gasUsedxPrice = 0;
    for (var i=0; i < transactionsArray.length; i++) {
        transaction = transactionsArray[i];
        if (transaction.isError === "0"){
            if(transaction.to === ethPublicAddress) {
                currentBalance += parseInt(transaction.value);
            } else if (transaction.from === ethPublicAddress) {
                currentBalance -= parseInt(transaction.value);
            }
        }
    }

    return (currentBalance - gasUsedxPrice);
}


var getPriceAtTime = function (transaction, callback, lastQuery=false) {
    const priceApi = `https://min-api.cryptocompare.com/data/pricehistorical?fsym=ETH&tsyms=BTC,USD,CAD&ts=${transaction.timeStamp}`;
    https.get(priceApi, res => {
        res.setEncoding("utf8");
        let body = "";
        res.on("data", data => {
            body += data;
        });
        res.on("end", () => {
            callback(JSON.parse(body), transaction, lastQuery);
        });
    });
}

function getPrices (transactions) {
    console.log("starting");
    console.log(`Compiling data for ${transactions.length} transactions`)
    transactions.forEach((transaction, i, transactions) => {
        setTimeout(() => {
            console.log(`Transaction: ${i+1}`);
            getPriceAtTime(transaction, (response, transaction, lastQuery=false) => {
                Prices.push({
                    transaction,
                    price: response
                });
                
                if (lastQuery) {
                    console.log(mapToCSV(Prices));
                }
            }, i===transactions.length-1);
        }, i*100);
    });
}
 

function mapToCSV(Prices) {
    // Fields: txnHash, date, amountBought, amountSold, priceInBtc, priceInUsd, priceInCad
    return Prices.map(transaction => {
        return ({
            txnIdHash: transaction.transaction.hash,
            date: new Date(parseInt(transaction.transaction.timeStamp) * 1000).toString(),
            amountBought: (transaction.transaction.to === ethPublicAddress) ? parseInt(transaction.transaction.value) * .000000000000000001 : 0,
            amountSold: (transaction.transaction.from === ethPublicAddress) ? parseInt(transaction.transaction.value) * .000000000000000001 : 0,
            priceInBtcAtTime: transaction.price.ETH.BTC,
            priceInUsdAtTime: transaction.price.ETH.USD,
            priceInCadAtTime: transaction.price.ETH.CAD
        })
    })
}

var main = function (response) {
    const transactions = response.result.filter((transaction) => {return transaction.isError === "0"});
    getPrices(transactions);
}

//Eth
var ethereumTransactions = []
ethPubKeys.forEach((key, i, keys) => {
    setTimeout(() => {
        getDataFromApi(getEthUrlForAddr(key)).then(response => {
            ethereumTransactions = ethereumTransactions.concat(response.result.filter((transaction) => {return transaction.isError === "0"}));    
            if (i === keys.length-1) {
                getPrices(ethereumTransactions);        
            }
        }).catch(error => {
            console.log("Something broke");
            return;
        });
    }, i * 200);
});