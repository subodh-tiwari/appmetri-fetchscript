import axios from 'axios';
import * as cheerio from 'cheerio';
import dateFormat from "dateformat";
import gplay from "google-play-scraper";
import unirest from 'unirest';
import { TOTAL_LIMIT_REVIEWS } from './constants.js';

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


export const getAppData = async (appId) => {
  return gplay.app({ appId, lang: "en", country: "in", })
    .then((data) => {
      return data;
    })
    .catch(() => {
      return {};
    });
};

export const getDeveloperAppsData = async (devId) => {
  let allApps = [];
  for (const country of countryList) {
    const apps = await gplay
      .developer({ devId, fullDetail: true, lang: "en", country })
      .then((data) => {
        return data;
      })
      .catch(() => {
        return [];
      });
    if (Array.isArray(apps)) allApps = allApps.concat(apps);
    else console.log(`Error: ${devId} - ${country} ${apps}`);
  }
  return allApps;
};


export const getSearchAppsData = async (term) => {
  return gplay.search({ term, fullDetail: true, lang: "en", country: "in", num: 250 })
    .then((data) => {
      return data;
    })
    .catch(() => {
      return {};
    });
};

export const getSimilarAppsData = async (appId) => {
  return gplay.similar({ appId, fullDetail: true, lang: "en", country: "in", })
    .then((data) => {
      return data;
    })
    .catch(() => {
      return {};
    });
};

export const getAppPermissionsData = async (appId) => {
  return gplay.permissions({ appId, lang: "en", country: "in", })
    .then((data) => {
      return data;
    })
    .catch(() => {
      return {};
    });
};

export const getAppReviewsData = async (appId) => {
  return gplay.reviews({
    appId,
    num: TOTAL_LIMIT_REVIEWS,
    lang: "en",
    country: "in",
  })
    .then((data) => {
      return data.data;
    })
    .catch(() => {
      return {};
    });
};

export const fetchAndParseAppAdsTxt = async (url) => {
  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      const fileContent = response.data;
      const lines = fileContent.split('\n');
      const parsedEntries = [];
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [adNetworkDomain, publisherId, relationship, certAuthorityId] = trimmedLine.split(',').map((item) => item.trim());
          parsedEntries.push({
            adNetworkDomain,
            publisherId,
            relationship,
            certAuthorityId: certAuthorityId || null,
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

export const getUniqueApps = async (jsonArray) => {
  const uniqueObjects = [
    ...new Map(jsonArray.map(item => [item.appId, item])).values()
  ];

  return uniqueObjects;
};

export const removeTrailingSlash = (url) => {
  return url.replace(/\/+$/, '');
};

export const isStringifiedJson = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsed = JSON.parse(value);
    return (typeof parsed === "object" && parsed !== null) || Array.isArray(parsed);
  } catch (error) {
    return false;
  }
};

const isArrayOfUndefined = (arr) => {
  return Array.isArray(arr) && arr.every(val => val === undefined);
}

export const getKeysAndValues = async (obj) => {
  const keys = [];
  const values = [];
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && !isArrayOfUndefined(value)) {
      keys.push(key);
      values.push(value);
    }
  });
  return { keys, values };
};

export const delay = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const getPlayStorePhoneNumber = async (url) => {
  return unirest
    .get(url)
    .headers({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36",
    })
    .then((response) => {
      let $ = cheerio.load(response.body);
      const phoneNumber = [];
      $(".pSEeg").each((i, el) => {
        phoneNumber[i] = $(el).text();
      });
      var re =
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
      if (re.test(phoneNumber[0])) {
        return `${phoneNumber[0]}`;
      }
      return "";
    })
    .catch((error) => {
      console.log("error getPlayStorePhoneNumber => ", error)
      return "";
    });
};

export const getDeveloperMapping = async (data) => {
  return {
    developer_id: data.developerId,
    internal_id: data.developerInternalID,
    name: data.developer,
  };
};

export const getAppsMapping = async (data, developerId, phoneNumber) => {
  return {
    app_id: data.appId,
    developer_id: developerId,
    name: data.title,
    url: data.url,
    phone_number: phoneNumber,
    email: data.developerEmail,
    address: data.developerAddress,
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

export const getChangelogsMapping = async (appId, data) => {
  return {
    app_id: appId,
    changelog: data.recentChanges,
    changes_on: new Date(data.updated),
  };
};

export const getAdsTxtMapping = async (appId, adNetworks) => {
  return {
    app_id: appId,
    ad_networks: JSON.stringify(adNetworks),
  };
};

export const getAppInstallsMapping = async (appId, data, oldInstalls) => {
  return {
    app_id: appId,
    change: +data.maxInstalls - +oldInstalls,
    current_installs: data.maxInstalls,
  };
};

export const getAppPermissionsMapping = async (appId, permissionsData) => {
  return {
    app_id: appId,
    permissions: JSON.stringify(permissionsData),
  };
};

export const getAppRatingsMapping = async (appId, data) => {
  return {
    app_id: appId,
    score: data.score,
    total_count: data.ratings,
    rating_1: data.histogram['1'],
    rating_2: data.histogram['2'],
    rating_3: data.histogram['3'],
    rating_4: data.histogram['4'],
    rating_5: data.histogram['5'],
  };
};

export const getAppReviewsMapping = async (appId, reviewData) => {
  return {
    app_id: appId,
    review: reviewData.text,
    reviewed_on: reviewData.date,
    // sentiment: '',
    review_info: JSON.stringify(reviewData)
  };
};

export const getNAAppsMapping = async (appId) => {
  return {
    app_id: appId,
  };
};