
Create 3 files in the local directory (siblings of index.js) called:
btcPubKeys.js
bchPubKeys.js
ethPubKeys.js

each file should look like this:
exports.btcPubKeys = ["1L4qX3rnLPnqyin5qNj2EN1e5kJBAZ6R9B", "1L4qX3bnLPnqyin5qNj2EN1e5kJBAZ6R9B"] 

where the variable is an array of your public keys.

run with:
node index.js | tee prices.txt

