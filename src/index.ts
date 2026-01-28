import AWS from "aws-sdk";
import {
    getAllAppIds,
    getNAAppByAppId,
    getAppByAppId,
    getOldInstalls,
    insertMultipleRows,
    poolGPS,
    getDeveloperByDeveloperId,
    getAppIdsPrisma,
    getAppIds,
} from "./query.js";
import {
    getAppData,
    getDeveloperAppsData,
    getAppsMapping,
    getPlayStorePhoneNumber,
    getUniqueApps,
    getDeveloperMapping,
    getChangelogsMapping,
    fetchAndParseAppAdsTxt,
    removeTrailingSlash,
    getAdsTxtMapping,
    getAppInstallsMapping,
    getAppPermissionsData,
    getAppPermissionsMapping,
    getAppRatingsMapping,
    getAppReviewsData,
    getAppReviewsMapping,
    getKeysAndValues,
    getNAAppsMapping,
    delay,
    shuffleArray,
    getSearchAppsData,
} from "./utils.js";
import type { PoolClient } from "pg";

AWS.config.update({
    region: "na",
    accessKeyId: "na",
    secretAccessKey: "na",
});

const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

const SQS_URL = "https://sqs.us-west-2.amazonaws.com/061039791083/apps";

const storeApps = async (
    clientGPS: PoolClient,
    result: AWS.SQS.Message[],
    no: string,
) => {
    for (const val of result) {
        const searchAppsData = await getSearchAppsData(val.Body as string);
        for (const searchApp of searchAppsData) {
            try {
                const deleteParams = {
                    QueueUrl: SQS_URL,
                    ReceiptHandle: val.ReceiptHandle,
                } as any;
                console.log(`no: ${no}, Processing ${searchApp}`);
                const app = await getAppByAppId(clientGPS, searchApp.appId);
                const naApp = await getNAAppByAppId(clientGPS, searchApp.appId);
                if (app && naApp) {
                    await sqs.deleteMessage(deleteParams).promise();
                    console.log(
                        `no: ${no}, Duplicate: Message with ReceiptHandle ${searchApp} deleted. `,
                    );
                    continue;
                }

                await clientGPS.query("BEGIN");

                const primaryAppData = await getAppData(searchApp.appId);

                if (Object.keys(primaryAppData).length === 0) {
                    const naAppsMapping = await getNAAppsMapping(
                        searchApp.appId,
                    );
                    const { keys: naAppsKeys, values: naAppsValues } =
                        await getKeysAndValues(naAppsMapping);
                    await insertMultipleRows(clientGPS, "na_apps", naAppsKeys, [
                        naAppsValues,
                    ]);
                    await clientGPS.query("COMMIT");
                    await delay(300);
                    await sqs.deleteMessage(deleteParams).promise();
                    console.log(
                        `no: ${no},  NoData: Message with ReceiptHandle ${searchApp} deleted.`,
                    );
                    continue;
                }

                let allApps = [];
                allApps.push(primaryAppData);

                // developer
                const developerMappingData =
                    await getDeveloperMapping(primaryAppData);
                const { keys: developerKeys, values: developerValues } =
                    await getKeysAndValues(developerMappingData);

                let developer = await getDeveloperByDeveloperId(
                    clientGPS,
                    developerMappingData.developer_id as string,
                );
                // console.log(
                //   `no: ${no}, developer: ${developerMappingData.developer_id}`,
                //   developer
                // );
                if (developer.length === 0) {
                    developer = await insertMultipleRows(
                        clientGPS,
                        "developers",
                        developerKeys,
                        [developerValues],
                    );

                    // fetch all apps under the developer

                    const developerAppsData = await getDeveloperAppsData(
                        primaryAppData.developer as string,
                    );
                    allApps = allApps.concat(developerAppsData);
                }

                // // fetch all similar apps data for all the apps under the developer
                // for (const dev of developerData) {
                //   const similarAppData = await getSimilarAppsData(dev.appId);
                //   allApps = allApps.concat(similarAppData);
                // }

                const uniqueApps = await getUniqueApps(allApps);
                const uniqueAppIds = uniqueApps.map(
                    (app) => app.appId as string,
                );
                const existingAppIds = await getAppIds(clientGPS, uniqueAppIds);
                const newAppIds = uniqueApps.filter(
                    (uniqueApp) => !existingAppIds.includes(uniqueApp.appId),
                );

                for (const app of newAppIds) {
                    //console.log(`${app.appId}`);
                    // fetch phone number of the app's developer
                    const phoneNumber = app.appId
                        ? await getPlayStorePhoneNumber(
                              `https://play.google.com/store/apps/details?id=${app.appId}`,
                          )
                        : "";

                    // apps
                    // Note :- for the below mapping, we are using the same developer ID.
                    const appsMappingData = await getAppsMapping(
                        app,
                        developer[0].id,
                        phoneNumber,
                    );
                    const { keys: appKeys, values: appValues } =
                        await getKeysAndValues(appsMappingData);
                    const storedApp = await insertMultipleRows(
                        clientGPS,
                        "apps",
                        appKeys,
                        [appValues],
                    );

                    // // ads_txt
                    // if (app.developerWebsite !== undefined) {
                    //   const adNetworks = await fetchAndParseAppAdsTxt(`${removeTrailingSlash(app.developerWebsite)}/app-ads.txt`);
                    //   const adsTxtMappingData = await getAdsTxtMapping(storedApp[0].id, adNetworks);
                    //   const { keys: adsTxtKeys, values: adsTxtValues } = await getKeysAndValues(adsTxtMappingData);
                    //   if (adNetworks.length > 0) {
                    //     await insertMultipleRows(clientGPS, 'ads_txt', adsTxtKeys, [adsTxtValues]);
                    //   }
                    // }

                    // installs
                    if (app.maxInstalls !== undefined) {
                        const oldInstalls = await getOldInstalls(
                            clientGPS,
                            storedApp[0].id,
                        );
                        const installsMappingData = await getAppInstallsMapping(
                            storedApp[0].id,
                            app,
                            oldInstalls,
                        );
                        const { keys: installsKeys, values: installsValues } =
                            await getKeysAndValues(installsMappingData);
                        await insertMultipleRows(
                            clientGPS,
                            "installs",
                            installsKeys,
                            [installsValues],
                        );
                    }

                    // // permissions
                    // const appPermissionsData = await getAppPermissionsData(app.appId);
                    // if (Object.keys(appPermissionsData).length === 0) {
                    //   const appPermissionsMappingData = await getAppPermissionsMapping(storedApp[0].id, appPermissionsData);
                    //   const { keys: appPermissionsKeys, values: appPermissionsValues } = await getKeysAndValues(appPermissionsMappingData);
                    //   await insertMultipleRows(clientGPS, 'permissions', appPermissionsKeys, [appPermissionsValues]);
                    // }

                    // ratings
                    if (app.score !== undefined || app.ratings !== undefined) {
                        const appRatingsMappingData =
                            await getAppRatingsMapping(storedApp[0].id, app);
                        const {
                            keys: appRatingsKeys,
                            values: appRatingsValues,
                        } = await getKeysAndValues(appRatingsMappingData);
                        await insertMultipleRows(
                            clientGPS,
                            "ratings",
                            appRatingsKeys,
                            [appRatingsValues],
                        );
                    }

                    // // reviews
                    // const appReviewsData = await getAppReviewsData(app.appId);
                    // if (Object.keys(appReviewsData).length === 0) {
                    //   for (const appReview of appReviewsData) {
                    //     const appReviewsMappingData = await getAppReviewsMapping(storedApp[0].id, appReview);
                    //     const { keys: appReviewsKeys, values: appReviewsValues } = await getKeysAndValues(appReviewsMappingData);
                    //     await insertMultipleRows(clientGPS, 'reviews', appReviewsKeys, [appReviewsValues]);
                    //   }
                    // }

                    // changelogs
                    if (app.recentChanges !== undefined) {
                        const appChangelogsMappingData =
                            await getChangelogsMapping(storedApp[0].id, app);
                        const {
                            keys: appChangelogsKeys,
                            values: appChangelogsValues,
                        } = await getKeysAndValues(appChangelogsMappingData);
                        await insertMultipleRows(
                            clientGPS,
                            "changelogs",
                            appChangelogsKeys,
                            [appChangelogsValues],
                        );
                    }
                }
                await clientGPS.query("COMMIT");
                await sqs.deleteMessage(deleteParams).promise();
                console.log(
                    `no: ${no},  Processed: Message with ReceiptHandle ${searchApp} deleted.`,
                );
            } catch (error: Error | any) {
                await clientGPS.query("ROLLBACK");
                console.error(
                    `no: ${no}, Transaction failed and rolled backed for ${searchApp} => `,
                    error.stack,
                );
            }
        }
    }
};

const consumeSqsMessages = async (
    clientGPS: PoolClient,
    clientGPS1: PoolClient,
    clientGPS2: PoolClient,
    no: number,
) => {
    const params = {
        QueueUrl: SQS_URL,
        MaxNumberOfMessages: 10, // Adjust based on the number of messages you want to consume at a time
        WaitTimeSeconds: 20, // Long polling
    };

    try {
        const data = await sqs.receiveMessage(params).promise();
        console.log(`no => ${no}--------------------------------------`);
        if (data.Messages) {
            const [first, second, third] = [
                data.Messages.slice(0, 3),
                data.Messages.slice(3, 6),
                data.Messages.slice(6),
            ];
            await Promise.all([
                storeApps(clientGPS, first, `${no}1`),
                storeApps(clientGPS1, second, `${no}2`),
                storeApps(clientGPS2, third, `${no}3`),
            ]);
        } else {
            console.log("No messages to process.");
        }
    } catch (error) {
        console.error("Error receiving or deleting SQS message:", error);
    }

    await consumeSqsMessages(clientGPS, clientGPS1, clientGPS2, no);
};

const startConsumer = async (no: number) => {
    console.log("Starting SQS consumer...");

    const clientGPS = await poolGPS.connect();
    const clientGPS1 = await poolGPS.connect();
    const clientGPS2 = await poolGPS.connect();
    await consumeSqsMessages(clientGPS, clientGPS1, clientGPS2, no);
    // Poll SQS every 5 seconds (adjust the interval as necessary)
    //setInterval(consumeSqsMessages(clientGPS), 12000);
};

startConsumer(1);
startConsumer(2);
startConsumer(3);
startConsumer(4);
