import axios from "axios";
import * as cheerio from "cheerio";
import dateFormat from "dateformat";
import gplay from "google-play-scraper";
import type { IFnPermissionsOptions } from "google-play-scraper";
import { TOTAL_LIMIT_REVIEWS } from "./constants.js";
import type { Model } from "typings";
import {
    Prisma,
    type ads_txt,
    type apps,
    type changelogs,
    type developers,
    type installs,
    type na_apps,
    type permissions,
    type ratings,
    type reviews,
} from "./generated/prisma/index.js";

const countryList = [
    "AO",
    "AR",
    "AT",
    "AU",
    "BD",
    "BE",
    "BR",
    "CA",
    "CD",
    "CH",
    "CL",
    "CN",
    "CO",
    "CZ",
    "DE",
    "DK",
    "DZ",
    "EG",
    "ES",
    "ET",
    "FI",
    "FR",
    "GB",
    "GH",
    "HK",
    "ID",
    "IE",
    "IL",
    "IN",
    "IR",
    "IT",
    "JP",
    "KE",
    "KR",
    "MA",
    "MM",
    "MX",
    "MY",
    "NG",
    "NL",
    "NO",
    "NP",
    "NZ",
    "PE",
    "PH",
    "PK",
    "PL",
    "PT",
    "RO",
    "RU",
    "SA",
    "SD",
    "SE",
    "SG",
    "TH",
    "TR",
    "TZ",
    "UA",
    "UG",
    "US",
    "UZ",
    "VE",
    "VN",
    "ZA",
    "TW",
    "AE",
];

export const getAppData = async (
    appId: string,
    lang?: string,
    // country?: string,
): Promise<Model.AppsData> => {
    return (
        gplay
            .app({ appId, lang: lang ?? "en" })
            // .app({ appId, lang: lang ?? "en", country: country ?? "in" })
            .then((data) => {
                return data as Model.AppsData;
            })
            .catch(() => {
                return {} as Model.AppsData;
            })
    );
};

export const getDeveloperAppsData = async (devId: string) => {
    let allApps: Model.DeveloperData[] = [];
    for (const country of countryList) {
        const apps = await gplay
            .developer({
                devId,
                fullDetail: true,
                lang: "en",
                country,
            })
            .then((data) => {
                return data as Model.DeveloperData[];
            })
            .catch(() => {
                return [] as Model.DeveloperData[];
            });
        if (Array.isArray(apps)) allApps = allApps.concat(apps);
        else console.log(`Error: ${devId} - ${country} ${apps}`);
    }
    return allApps;
};

export const getSearchAppsData = async (
    term: string,
): Promise<Model.SearchData[]> => {
    return gplay
        .search({ term, fullDetail: true, lang: "en", country: "in", num: 250 })
        .then((data) => {
            return data as Model.SearchData[];
        })
        .catch(() => {
            return [] as Model.SearchData[];
        });
};

export const getSimilarAppsData = async (
    appId: string,
): Promise<Model.SimilarAppsData[]> => {
    return gplay
        .similar({ appId, fullDetail: true, lang: "en", country: "in" })
        .then((data) => {
            return data as Model.SimilarAppsData[];
        })
        .catch(() => {
            return [] as Model.SimilarAppsData[];
        });
};

export const getAppPermissionsData = async (
    appId: string,
): Promise<Model.AppPermissionsData[]> => {
    return gplay
        .permissions({
            appId,
            lang: "en",
            country: "in",
        } as IFnPermissionsOptions extends Model.ExtendedIFnPermissionsOptions
            ? Model.ExtendedIFnPermissionsOptions
            : IFnPermissionsOptions)
        .then((data) => {
            return data as Model.AppPermissionsData[];
        })
        .catch(() => {
            return [] as Model.AppPermissionsData[];
        });
};

export const getAppReviewsData = async (
    appId: string,
): Promise<Model.ReviewData[]> => {
    return gplay
        .reviews({
            appId,
            num: TOTAL_LIMIT_REVIEWS,
            lang: "en",
            country: "in",
        })
        .then((data) => {
            return data.data as Model.ReviewData[];
        })
        .catch(() => {
            return [] as Model.ReviewData[];
        });
};

export const fetchAndParseAppAdsTxt = async (url: string) => {
    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            const fileContent = response.data;
            const lines = fileContent.split("\n");
            const parsedEntries: Model.AppAdsTxtRecord[] = [];
            lines.forEach((line: string) => {
                const trimmedLine = line.trim();
                if (trimmedLine && !trimmedLine.startsWith("#")) {
                    const [
                        adNetworkDomain,
                        publisherId,
                        relationship,
                        certAuthorityId,
                    ] = trimmedLine
                        .split(",")
                        .map((item: string) => item.trim());
                    parsedEntries.push({
                        adNetworkDomain,
                        publisherId,
                        relationship,
                        certAuthorityId: certAuthorityId || "",
                    });
                }
            });
            return parsedEntries;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
};

export const getUniqueApps = async (jsonArray: Model.AppsData[]) => {
    const uniqueObjects = [
        ...new Map(jsonArray.map((item) => [item.appId, item])).values(),
    ];

    return uniqueObjects;
};

export const removeTrailingSlash = (url: string) => {
    return url.replace(/\/+$/, "");
};

export const isStringifiedJson = (value: string) => {
    if (typeof value !== "string") {
        return false;
    }

    try {
        const parsed = JSON.parse(value);
        return (
            (typeof parsed === "object" && parsed !== null) ||
            Array.isArray(parsed)
        );
    } catch (error) {
        return false;
    }
};

const isArrayOfUndefined = (arr: any[]) => {
    return Array.isArray(arr) && arr.every((val) => val === undefined);
};

// map object to keys and values arrays for bulk insertion
export const getKeysAndValues = async (
    obj: Record<string, any>,
): Promise<{ keys: string[]; values: any[] }> => {
    const keys: string[] = [];
    const values: string | number[] = [];
    Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined && !isArrayOfUndefined(value)) {
            keys.push(key);
            values.push(value);
        }
    });
    return { keys, values };
};

export const delay = async (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const getPlayStorePhoneNumber = async (url: string): Promise<string> => {
    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36",
            },
        });
        const $ = cheerio.load(response.data);
        const phoneNumber: string[] = [];
        $(".pSEeg").each((i, el) => {
            phoneNumber[i] = $(el).text();
        });
        const re =
            /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
        if (phoneNumber[0] && re.test(phoneNumber[0])) {
            return phoneNumber[0];
        }
        return "";
    } catch (error: unknown) {
        console.log("error getPlayStorePhoneNumber => ", error);
        return "";
    }
};

export const getDeveloperMapping = async (data: Model.AppsData) => {
    return {
        developer_id: data.developerId,
        internal_id: data.developerInternalID,
        name: data.developer,
    };
};

export const getAppsMapping = async (
    data: Model.AppsData,
    developerId: number,
    phoneNumber: string,
): Promise<apps> => {
    return {
        id: 0, // will be auto-generated
        app_id: data.appId ? data.appId : "",
        developer_id: developerId,
        name: data.title ? data.title : "",
        url: data.url ? data.url : "",
        phone_number: phoneNumber,
        email: data.developerEmail ? data.developerEmail : "",
        address: data.developerLegalAddress ? data.developerLegalAddress : "",
        website: data.developerWebsite ? data.developerWebsite : "",
        description: data.description ? data.description : "",
        summary: data.summary ? data.summary : "",
        total_ratings: data.ratings ? data.ratings : null,
        min_installs: data.minInstalls ? BigInt(data.minInstalls) : null,
        max_installs: data.maxInstalls ? BigInt(data.maxInstalls) : null,
        price: data.price ? new Prisma.Decimal(data.price) : null,
        free: data.free ? data.free : false,
        currency: data.currency ? data.currency : "",
        available: data.released ? true : false,
        offers_iap: data.offersIAP ? data.offersIAP : false,
        iap_range: data.IAPRange ? data.IAPRange : "",
        android_version: data.androidVersion ? data.androidVersion : "",
        android_max_version: data.androidMaxVersion
            ? data.androidMaxVersion
            : "",
        privacy_policy: data.privacyPolicy ? data.privacyPolicy : "",
        category: data.genreId ? data.genreId : "",
        icon: data.icon ? data.icon : "",
        header_image: data.headerImage ? data.headerImage : "",
        screenshots: data.screenshots ? data.screenshots.join(",") : "",
        video: data.video ? data.video : "",
        video_image: data.videoImage ? data.videoImage : "",
        preview_video: data.previewVideo ? data.previewVideo : "",
        content_rating: data.contentRating ? data.contentRating : "",
        content_rating_description: data.contentRatingDescription
            ? data.contentRatingDescription
            : "",
        ad_supported: data.adSupported ? data.adSupported : false,
        released: data.released
            ? dateFormat(data.released, "yyyy-mm-dd")
            : "1970-01-01",
        last_updated_at: data.updated
            ? new Date(data.updated)
            : new Date("1970-01-01"),
        version: data.version ? data.version : "",
        recent_changes: data.recentChanges ? data.recentChanges : "",
        comments: data.comments ? data.comments : [],
        preregister: data.preregister ? data.preregister : false,
        is_available_in_play_store: data.isAvailableInPlayPass
            ? data.isAvailableInPlayPass
            : false,
        early_access_enabled: data.earlyAccessEnabled
            ? data.earlyAccessEnabled
            : false,
        created_at: new Date(),
        updated_at: new Date(),
    };
};

export const getChangelogsMapping = async (
    appId: number,
    data: Model.AppsData,
): Promise<changelogs> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
        changelog: data.recentChanges ? data.recentChanges : "",
        changes_on: data.updated
            ? new Date(data.updated)
            : new Date("1970-01-01T00:00:00Z"),
        created_at: new Date(),
    };
};

export const getAdsTxtMapping = async (
    appId: number,
    adNetworks: Model.AppAdsTxtRecord[],
): Promise<ads_txt> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
        ad_networks: JSON.stringify(adNetworks),
        created_at: new Date(),
    };
};

export const getAppInstallsMapping = async (
    appId: number,
    data: Model.AppsData,
    oldInstalls: bigint,
): Promise<installs> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
        change: data.maxInstalls
            ? BigInt(data.maxInstalls) - BigInt(oldInstalls)
            : 0n,
        current_installs: data.maxInstalls ? BigInt(data.maxInstalls) : 0n,
        created_at: new Date(),
    };
};

export const getAppPermissionsMapping = async (
    appId: number,
    permissionsData: Model.AppPermissionsData[],
): Promise<permissions> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
        permissions: JSON.stringify(permissionsData),
        created_at: new Date(),
    };
};

export const getAppRatingsMapping = async (
    appId: number,
    data: Model.AppsData,
): Promise<ratings> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
        score: data.score ? new Prisma.Decimal(data.score) : null,
        total_count: data.ratings ? BigInt(data.ratings) : 0n,
        rating_1: data.histogram?.[1] ? BigInt(data.histogram["1"]) : 0n,
        rating_2: data.histogram?.[2] ? BigInt(data.histogram["2"]) : 0n,
        rating_3: data.histogram?.[3] ? BigInt(data.histogram["3"]) : 0n,
        rating_4: data.histogram?.[4] ? BigInt(data.histogram["4"]) : 0n,
        rating_5: data.histogram?.[5] ? BigInt(data.histogram["5"]) : 0n,
        created_at: new Date(),
    };
};

export const getAppReviewsMapping = async (
    appId: number,
    reviewData: Model.ReviewData,
): Promise<reviews> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
        review: reviewData.text,
        reviewed_on: new Date(reviewData.date),
        sentiment: "",
        review_info: JSON.stringify(reviewData),
        created_at: new Date(),
    };
};

export const getNAAppsMapping = async (appId: string): Promise<na_apps> => {
    return {
        id: 0, // will be auto-generated
        app_id: appId,
    };
};
