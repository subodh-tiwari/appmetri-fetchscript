import type { PoolClient } from "pg";
import {
    getAllAppIds,
    getNAAppByAppId,
    getAppByAppId,
    getOldInstalls,
    insertMultipleRows,
    poolGPS,
    getDeveloperByDeveloperId,
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
} from "./utils.js";
import type { Model } from "typings";

const storeApps = async (clientGPS: PoolClient) => {
    const res = await clientGPS.query("SELECT app_id FROM all_unique_apps");
    for (const val of res.rows) {
        try {
            const app = await getAppByAppId(clientGPS, val.app_id);
            const naApp = await getNAAppByAppId(clientGPS, val.app_id);
            if (app && naApp) {
                console.log("OLD => ", val.app_id);
                continue;
            }

            await clientGPS.query("BEGIN");

            const primaryAppData = await getAppData(val.app_id);

            if (Object.keys(primaryAppData).length === 0) {
                const naAppsMapping = await getNAAppsMapping(val.app_id);
                const { keys: naAppsKeys, values: naAppsValues } =
                    await getKeysAndValues(naAppsMapping);
                await insertMultipleRows(clientGPS, "na_apps", naAppsKeys, [
                    naAppsValues,
                ]);
                await clientGPS.query("COMMIT");
                await delay(300);
                console.log("OLD => ", val.app_id);
                continue;
            }
            console.log("NEW => ", val.app_id);

            let allApps: Model.AppsData[] = [];
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
            for (const app of uniqueApps) {
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
                    const appRatingsMappingData = await getAppRatingsMapping(
                        storedApp[0].id,
                        app,
                    );
                    const { keys: appRatingsKeys, values: appRatingsValues } =
                        await getKeysAndValues(appRatingsMappingData);
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
                    const appChangelogsMappingData = await getChangelogsMapping(
                        storedApp[0].id,
                        app,
                    );
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
        } catch (error: any) {
            await clientGPS.query("ROLLBACK");
            console.error(
                `Transaction failed and rolled backed for ${val.app_id} => `,
                error.stack,
            );
        }
    }
};

const clientGPS = await poolGPS.connect();
storeApps(clientGPS);
