//https://www.cryptocompare.com/api/#-api-data-histominute-

const https = require("https");

const apiKey = "5WU911P6VS8P4472M52Q1IGYGD2BS385HT";
const publicAddress = "0x5e8e44fe4564349925a184ef81c6459aacba2cf7";
const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${publicAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

var Prices = [];
  
https.get(url, res => {
  res.setEncoding("utf8");
  let body = "";
  res.on("data", data => {
    body += data;
  });
  res.on("end", () => {
    main(JSON.parse(body));
  });
});


var calculateBalanceFromTransactions = function(transactionsArray) {
    var currentBalance = 0;
    var transaction;
    var gasUsedxPrice = 0;
    for (var i=0; i < transactionsArray.length; i++) {
        transaction = transactionsArray[i];
        if (transaction.isError === "0"){
            if(transaction.to === publicAddress) {
                currentBalance += parseInt(transaction.value);
            } else if (transaction.from === publicAddress) {
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
            callback(body, transaction, lastQuery);
        });
    });
}

function getPrices (transactions) {
    console.log("starting");

    transactions.forEach((transaction, i, transactions) => {
        setTimeout(() => {
            getPriceAtTime(transaction, (response, transaction, lastQuery=false) => {
                Prices.push({
                    timeStamp: transaction.timeStamp,
                    price: response
                });
                
                console.log("Pushing for i = " + i);
                if (lastQuery) {
                    console.log(Prices);
                }
            }, i===transactions.length-1);
        }, i*1000);
    });
}
 

var main = function (response) {
    const transactions = response.result.filter((transaction) => {return transaction.isError === "0"});
    getPrices(transactions);
}
