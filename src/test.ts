import type { PoolClient } from "pg";
import {
    getNAAppByAppId,
    getAppByAppId,
    getOldInstalls,
    insertMultipleRows,
    getDeveloperByDeveloperId,
    insertSingleRow,
    getTestingAppIds,
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
import { prisma } from "./lib/prisma.js";
import type { developers } from "./generated/prisma/index.js";
import axios from "axios";

// await prisma.$executeRawUnsafe("BEGIN");
// const data = await insertSingleRow<developers>(
//     prisma,
//     "developers",
//     ["developer_id", "internal_id", "name"],
//     ["na5", "na5", "na5"],
// );
// console.log(data);
// if (data) {
//     await prisma.$executeRawUnsafe("ROLLBACK");
//     console.log("No data inserted, transaction rolled back.");
//     process.exit(1);
// }
// await prisma.$executeRawUnsafe("COMMIT");

// const newApp = { appId: "com.whatsapp" };
// const storedNewApp = { id: 100 };
// const appPermissionsData = await getAppPermissionsData(newApp.appId as string);
// console.log("appPermissionsData:", appPermissionsData);
// if (appPermissionsData.length > 0) {
//     const appPermissionsMappingData = await getAppPermissionsMapping(
//         storedNewApp.id,
//         appPermissionsData,
//     );
//     const { keys: appPermissionsKeys, values: appPermissionsValues } =
//         await getKeysAndValues(appPermissionsMappingData);
//     console.log("appPermissionsKeys:", appPermissionsKeys);
//     console.log("appPermissionsValues:", appPermissionsValues);
//     await insertMultipleRows(prisma, "permissions", appPermissionsKeys, [
//         appPermissionsValues,
//     ]);
// }

// const appIds = await getTestingAppIds(prisma);
// console.log("appIds:", appIds);
// for (const appId of appIds) {
//     const appData = await getAppData(appId.app_id);
//     console.log(`appData for ${appId.app_id}:`, appData.categories);
// }

//     const appData = await getAppData(appId.app_id);
//     console.log(`appData for ${appId.app_id}:`, appData.categories);

// const i18n_countries = await axios
//     .get(`https://data.42matters.com/api/meta/android/apps/app_languages.json`)
//     .then((res) => res.data);
// console.log("i18n_countries:", i18n_countries);
// const appIds = await getTestingAppIds(prisma);
// console.log("appIds:", appIds);
// for (const appId of appIds) {
//     for (const country of i18n_countries.supported_languages) {
//         const appData = await getAppData(appId.app_id, country.language_code);
//         console.log(
//             `appData for ${appId.app_id} in ${country.language_code}:`,
//             appData.available,
//         );
//     }
// }
