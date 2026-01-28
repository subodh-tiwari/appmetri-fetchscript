import axios from "axios";
import * as cheerio from "cheerio";
import dateFormat from "dateformat";
import gplay from "google-play-scraper";
import type { IFnPermissionsOptions } from "google-play-scraper";
import { TOTAL_LIMIT_REVIEWS } from "./constants.js";
import type { Model } from "typings";

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

export const getAppData = async (appId: string): Promise<Model.AppsData> => {
    return gplay
        .app({ appId, lang: "en", country: "in" })
        .then((data) => {
            return data as Model.AppsData;
        })
        .catch(() => {
            return {} as Model.AppsData;
        });
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
    developerId: string,
    phoneNumber: string,
) => {
    return {
        app_id: data.appId,
        developer_id: developerId,
        name: data.title,
        url: data.url,
        phone_number: phoneNumber,
        email: data.developerEmail,
        address: data.developerLegalAddress,
        website: data.developerWebsite,
        description: data.description,
        summary: data.summary,
        total_ratings: data.ratings,
        min_installs: data.minInstalls,
        max_installs: data.maxInstalls,
        price: data.price,
        free: data.free,
        currency: data.currency,
        available: data.released ? true : false,
        offers_iap: data.offersIAP,
        iap_range: data.IAPRange,
        android_version: data.androidVersion,
        android_max_version: data.androidMaxVersion,
        privacy_policy: data.privacyPolicy,
        category: data.genreId,
        icon: data.icon,
        header_image: data.headerImage,
        screenshots: data.screenshots,
        video: data.video,
        video_image: data.videoImage,
        preview_video: data.previewVideo,
        content_rating: data.contentRating,
        content_rating_description: data.contentRatingDescription,
        ad_supported: data.adSupported,
        released: data.released ? dateFormat(data.released, "yyyy-mm-dd") : "",
        last_updated_at: data.updated ? new Date(data.updated) : "",
        version: data.version,
        recent_changes: data.recentChanges,
        comments: data.comments,
        preregister: data.preregister,
        is_available_in_play_store: data.isAvailableInPlayPass,
        early_access_enabled: data.earlyAccessEnabled,
    };
};

export const getChangelogsMapping = async (
    appId: string,
    data: Model.AppsData,
) => {
    return {
        app_id: appId,
        changelog: data.recentChanges,
        changes_on: data.updated
            ? new Date(data.updated)
            : "1970-01-01T00:00:00Z",
    };
};

export const getAdsTxtMapping = async (
    appId: string,
    adNetworks: Model.AppAdsTxtRecord[],
) => {
    return {
        app_id: appId,
        ad_networks: JSON.stringify(adNetworks),
    };
};

export const getAppInstallsMapping = async (
    appId: string,
    data: Model.AppsData,
    oldInstalls: number,
) => {
    return {
        app_id: appId,
        change: data.maxInstalls ? +data.maxInstalls - +oldInstalls : 0,
        current_installs: data.maxInstalls,
    };
};

export const getAppPermissionsMapping = async (
    appId: string,
    permissionsData: Model.AppPermissionsData[],
) => {
    return {
        app_id: appId,
        permissions: JSON.stringify(permissionsData),
    };
};

export const getAppRatingsMapping = async (
    appId: string,
    data: Model.AppsData,
) => {
    return {
        app_id: appId,
        score: data.score,
        total_count: data.ratings,
        rating_1: data.histogram ? data.histogram["1"] : 0,
        rating_2: data.histogram ? data.histogram["2"] : 0,
        rating_3: data.histogram ? data.histogram["3"] : 0,
        rating_4: data.histogram ? data.histogram["4"] : 0,
        rating_5: data.histogram ? data.histogram["5"] : 0,
    };
};

export const getAppReviewsMapping = async (
    appId: string,
    reviewData: Model.ReviewData,
) => {
    return {
        app_id: appId,
        review: reviewData.text,
        reviewed_on: reviewData.date,
        // sentiment: '',
        review_info: JSON.stringify(reviewData),
    };
};

export const getNAAppsMapping = async (appId: string) => {
    return {
        app_id: appId,
    };
};
