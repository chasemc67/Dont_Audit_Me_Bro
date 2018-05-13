### Compile blockchain trade information using only public addresses as input

![alt text](https://github.com/chasemc67/DontAuditMeBro/blob/master/assets/readme.gif "sample")   
  
A collection of scripts which automation compiling trade information, given only public addresses. 
Works with:
* Bitcoin
* Bitcoin Cash
* Ethereum


#### to Use:
Create 3 files in the local directory (siblings of index.js) called:
btcPubKeys.js
bchPubKeys.js
ethPubKeys.js

each file should look like this:
`exports.btcPubKeys = ["1L4qX3rnLPnqyin5qNj2EN1e5kJBAZ6R9B", "1L4qX3bnLPnqyin5qNj2EN1e5kJBAZ6R9B"]`
where the variable is an array of your public keys.
  
a sample can be found [here](https://github.com/chasemc67/DontAuditMeBro/blob/master/samplePubKeys.js) 


#### run with:
node index.js btc



#### Output:
`[
    { 
        amountBought: 0.05735622,
        timeStamp: 1500129909,
        date: '2017-07-15 07:45:09',
        amountSold: 0,
        pubKey: '1L4qX3unLPnqyin5qLj2EN1e5kJBAZ6R9B',
        priceOfBtcAtTime: 1,
        priceOfUsdAtTime: 1975.08,
        priceOfCadAtTime: 2620.1 
    },{ 
        amountBought: 0.03145166,
        timeStamp: 1513689110,
        date: '2017-12-19 05:11:50',
        amountSold: 0,
        pubKey: '18XdhhXCQmNJsznXUwLuKuNjDFXm27s5u8',
        priceOfBtcAtTime: 1,
        priceOfUsdAtTime: 17523.7,
        priceOfCadAtTime: 22467.94 
    }
]`

Output is an array of buy or sell events. Along with each event is the price of the coin at that time, in USD, BTC, and CAD. 
