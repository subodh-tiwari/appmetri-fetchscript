// import { getSimilarAppsData } from "./utils.js";

// const appIds = [];
// const primarySimilarAppData = await getSimilarAppsData("com.meesho.supply");
// for (const primarySimilarApp of primarySimilarAppData) {
//     appIds.push(primarySimilarApp.appId);
//     const secondarySimilarAppData = await getSimilarAppsData(primarySimilarApp.appId);
//     for (const secondarySimilarApp of secondarySimilarAppData) {
//         appIds.push(secondarySimilarApp.appId);
//     }
// }
// console.log(appIds.toString());

import { getSearchAppsData } from "./utils.js";

const searchAppsData = await getSearchAppsData("com.lgsmartsolutions.radio945stationhoustonfmmusiconlinefreehd");
const appIds = [];
for (const searchApp of searchAppsData) {
    appIds.push(searchApp.appId);
}
console.log([...new Set(appIds)].toString());