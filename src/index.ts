import {
    getNAAppByAppId,
    getAppByAppId,
    getOldInstalls,
    insertMultipleRows,
    getDeveloperByDeveloperId,
    getAppIds,
    upsertDeveloper,
    insertSingleRow,
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
import { prisma } from "./lib/prisma.js";
import type { apps } from "./generated/prisma/index.js";

const storeApps = async (searchTerm: string) => {
    const searchAppsData = await getSearchAppsData(searchTerm);
    // loop over each appId from searchAppsData for given searchTerm
    for (const searchApp of searchAppsData) {
        // transaction begin
        await prisma.$executeRawUnsafe("BEGIN");
        try {
            const app = await getAppByAppId(prisma, searchApp.appId);
            const naApp = await getNAAppByAppId(prisma, searchApp.appId);
            if (app.app_id && naApp.app_id) {
                continue;
            }

            // fetch primary app data
            const primaryAppData = await getAppData(searchApp.appId);

            // if no data found for the app, insert into na_apps and continue
            if (Object.keys(primaryAppData).length === 0) {
                const naAppsMapping = await getNAAppsMapping(searchApp.appId);
                const { keys: naAppsKeys, values: naAppsValues } =
                    await getKeysAndValues(naAppsMapping);
                await insertSingleRow(
                    prisma,
                    "na_apps",
                    naAppsKeys,
                    naAppsValues,
                );
                continue;
            }

            // start adding all the apps data into array so that in the last we can bulk insert into the apps table
            let allApps: any[] = [];

            // add primary app data first
            allApps.push(primaryAppData);

            /**
             * fetch developer related data from the primary app
             * and insert into developers table if not exists
             */

            // map developer data
            const developerMappingData =
                await getDeveloperMapping(primaryAppData);
            const { keys: developerKeys, values: developerValues } =
                await getKeysAndValues(developerMappingData);

            // upsert developer data into developers table
            const developer = await upsertDeveloper(
                prisma,
                developerMappingData,
            );

            // fetch all apps under the developer
            const developerAppsData = await getDeveloperAppsData(
                primaryAppData.developer as string,
            );
            allApps = allApps.concat(developerAppsData);

            // // fetch all similar apps data for all the apps under the developer
            // for (const dev of developerAppsData) {
            //     const similarAppData = await getSimilarAppsData(dev.appId);
            //     allApps = allApps.concat(similarAppData);
            // }

            // find all the unique apps from allApps array
            const uniqueApps = await getUniqueApps(allApps);

            // check which appIds are already present in the apps table
            const uniqueAppIds = uniqueApps.map((app) => app.appId as string);
            const existingAppIds = await getAppIds(prisma, uniqueAppIds);

            // filter out the new apps data which are not present in the apps table
            const newApps = uniqueApps.filter(
                (uniqueApp) =>
                    !existingAppIds.includes(
                        uniqueApp.appId ? uniqueApp.appId : "",
                    ),
            );

            /**
             * fetch existing app related data from various tables and
             * update the existing apps data in the ratings table
             */

            const newAppsDataToInsert: apps[] = [];
            // loop over each new app and insert into apps and related tables
            for (const newApp of newApps) {
                // fetch phone number of the app's developer
                const phoneNumber = newApp.appId
                    ? await getPlayStorePhoneNumber(
                          `https://play.google.com/store/apps/details?id=${newApp.appId}`,
                      )
                    : "";

                // insert into apps table
                // Note :- for the below mapping, we are using the same developer ID.
                const newAppsMappingData = await getAppsMapping(
                    newApp,
                    developer.id,
                    phoneNumber,
                );
                newAppsDataToInsert.push(newAppsMappingData);

                // TODO: bulk insert all new apps at once after collecting all mappings
                const { keys: newAppKeys, values: newAppValues } =
                    await getKeysAndValues(newAppsMappingData);
                const storedNewApp = await insertSingleRow<apps>(
                    prisma,
                    "apps",
                    newAppKeys,
                    [newAppValues],
                );

                // ads_txt
                if (newApp.developerWebsite !== undefined) {
                    const adNetworks = await fetchAndParseAppAdsTxt(
                        `${removeTrailingSlash(newApp.developerWebsite)}/app-ads.txt`,
                    );
                    const adsTxtMappingData = await getAdsTxtMapping(
                        storedNewApp.id,
                        adNetworks,
                    );
                    const { keys: adsTxtKeys, values: adsTxtValues } =
                        await getKeysAndValues(adsTxtMappingData);
                    if (adNetworks.length > 0) {
                        await insertSingleRow(
                            prisma,
                            "ads_txt",
                            adsTxtKeys,
                            adsTxtValues,
                        );
                    }
                }

                // installs
                if (newApp.maxInstalls !== undefined) {
                    const oldInstalls = await getOldInstalls(
                        prisma,
                        storedNewApp.id,
                    );
                    const installsMappingData = await getAppInstallsMapping(
                        storedNewApp.id,
                        newApp,
                        oldInstalls,
                    );
                    const { keys: installsKeys, values: installsValues } =
                        await getKeysAndValues(installsMappingData);
                    await insertMultipleRows(prisma, "installs", installsKeys, [
                        installsValues,
                    ]);
                }

                // permissions
                const appPermissionsData = await getAppPermissionsData(
                    newApp.appId as string,
                );
                if (Object.keys(appPermissionsData).length === 0) {
                    const appPermissionsMappingData =
                        await getAppPermissionsMapping(
                            storedNewApp.id,
                            appPermissionsData,
                        );
                    const {
                        keys: appPermissionsKeys,
                        values: appPermissionsValues,
                    } = await getKeysAndValues(appPermissionsMappingData);
                    await insertSingleRow(
                        prisma,
                        "permissions",
                        appPermissionsKeys,
                        [appPermissionsValues],
                    );
                }

                // ratings
                if (
                    newApp.score !== undefined ||
                    newApp.ratings !== undefined
                ) {
                    const appRatingsMappingData = await getAppRatingsMapping(
                        storedNewApp.id,
                        newApp,
                    );
                    const { keys: appRatingsKeys, values: appRatingsValues } =
                        await getKeysAndValues(appRatingsMappingData);
                    await insertSingleRow(
                        prisma,
                        "ratings",
                        appRatingsKeys,
                        appRatingsValues,
                    );
                }

                // // reviews
                // const appReviewsData = await getAppReviewsData(newApp.appId);
                // if (Object.keys(appReviewsData).length === 0) {
                //   for (const appReview of appReviewsData) {
                //     const appReviewsMappingData = await getAppReviewsMapping(storedNewApp[0].id, appReview);
                //     const { keys: appReviewsKeys, values: appReviewsValues } = await getKeysAndValues(appReviewsMappingData);
                //     await insertMultipleRows(clientGPS, 'reviews', appReviewsKeys, [appReviewsValues]);
                //   }
                // }

                // changelogs
                if (newApp.recentChanges !== undefined) {
                    const appChangelogsMappingData = await getChangelogsMapping(
                        storedNewApp.id,
                        newApp,
                    );
                    const {
                        keys: newAppChangelogsKeys,
                        values: newAppChangelogsValues,
                    } = await getKeysAndValues(appChangelogsMappingData);
                    await insertSingleRow(
                        prisma,
                        "changelogs",
                        newAppChangelogsKeys,
                        newAppChangelogsValues,
                    );
                }
            }
            await prisma.$executeRawUnsafe("COMMIT");
        } catch (error: Error | any) {
            await prisma.$executeRawUnsafe("ROLLBACK");
            console.error(
                `Transaction failed and rolled backed for ${searchApp} => `,
                error.stack,
            );
        }
    }
};

storeApps("Wallpaper");
