import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { poolGPS } from "./query.js";

// AWS SQS configuration
const sqs = new AWS.SQS({ region: 'us-west-2' });
const QUEUE_URL = 'https://sqs.us-west-2.amazonaws.com/061039791083/apps'; // Replace with your SQS queue URL
const BATCH_SIZE = 1000; // Number of records to fetch per batch from table
const SQS_BATCH_SIZE = 10; // Max number of messages SQS allows in one batch

const processApps = async (clientPoolGPS, initial, end) => {

    let offset = 0;
    let recordsProcessed = 0;

    while (true) {
        // Fetch a batch of appIds
        // const res = await clientPoolGPS.query('SELECT name FROM developers WHERE id >= $1 AND id < $2 ORDER BY id LIMIT $3 OFFSET $4', [initial, end, BATCH_SIZE, offset]);
        const res = await clientPoolGPS.query('SELECT app_id FROM na_apps_copy WHERE id >= $1 AND id < $2 ORDER BY id LIMIT $3 OFFSET $4', [initial, end, BATCH_SIZE, offset]);

        if (res.rows.length === 0) {
            console.log('All records processed.');
            break;
        }

        // Prepare messages for SQS
        const messages = res.rows.map(row => ({
            Id: uuidv4(),
            MessageBody: row.app_id,
        }));

        // Send messages in batches to SQS
        for (let i = 0; i < messages.length; i += SQS_BATCH_SIZE) {
            const batch = messages.slice(i, i + SQS_BATCH_SIZE);
            await sendMessagesToSQS(batch);
        }

        offset += BATCH_SIZE;
        recordsProcessed += res.rows.length;
        console.log(`Processed ${recordsProcessed} records so far.`);
    }
}

// Function to send messages to SQS
const sendMessagesToSQS = async (messages) => {
    const params = {
        QueueUrl: QUEUE_URL,
        Entries: messages,
    };

    try {
        const result = await sqs.sendMessageBatch(params).promise();
    } catch (error) {
        console.error('Error sending to SQS:', error);
    }
}

// Main function to start the process
(async () => {
    try {
        const clientPoolGPS = await poolGPS.connect();
        processApps(clientPoolGPS, 1, 400000);
        processApps(clientPoolGPS, 400000, 800000);
        processApps(clientPoolGPS, 800000, 1200000);
        processApps(clientPoolGPS, 1200000, 1600000);
        processApps(clientPoolGPS, 1600000, 2000000);
        processApps(clientPoolGPS, 2000000, 2400000);
        console.log('Finished processing all apps.');
    } catch (error) {
        console.error('Error during processing:', error);
    } finally {
        poolGPS.end();
    }
})();
