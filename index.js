// until node index.js; do sleep 1; done
const AWS = require('aws-sdk');
const AmazonDaxClient = require('amazon-dax-client');

const TABLE = 'DO_NOT_DELETE';
const ITEMS_COUNT = 10_000;
const EDP = process.env.DAX_EDP;
if (!EDP) {
  throw new Error('No endpoint!');
}

const sleep = ms => new Promise((r) => setTimeout(r, ms));

async function main() {
    const ddb = new AmazonDaxClient({ endpoints: [EDP], region: 'us-east-1' })

    const keys = [];
    let nextToken = undefined;
    for (let j = 0; j < 10; j++) {
        const result = await ddb.scan({
            TableName: TABLE,
            Limit: ITEMS_COUNT,
            ExclusiveStartKey: nextToken,
        }).promise();

        console.log(`Got ${result.Items.length}`);
        nextToken = result.LastEvaluatedKey;

        for (let item of result.Items) {
            keys.push(item.key.S);
        }

        if (!nextToken) {
            console.log('Stopping scans prematurely');
            break;
        }
    }

    // generate random traffic to keys
    let batch = [];
    for (let i = 0; i < Infinity; i++) {
        const d = new Date();
        const h = d.getHours();
        if (h % 2) {
            await sleep(120_000);
        } else {
        const index = Math.floor(Math.random() * keys.length);
        const key = keys[index];
        batch.push(ddb.getItem({
            TableName: TABLE,
            Key: { key: { S: key } },
        }).promise());
        //console.log(`Got item key ${key}`);
        if (batch.length === 50) {
            await Promise.all(batch);
            batch = [];
        }
        }
    }
}

main().catch(err => {
    console.log(err);
    process.exit(1);
});

