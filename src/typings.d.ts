declare module "typings" {
    export namespace Model {
        export interface DeveloperData {
            url: string;
            appId: string;
            title: string;
            summary: string;
            developer: string;
            developerId: string;
            icon: string;
            score: number;
            scoreText: string;
            priceText: string;
            free: boolean;
        }

        interface ExtendedIFnPermissionsOptions {
            country: number;
        }

        interface AppAdsTxtRecord {
            adNetworkDomain?: string;
            publisherId?: string;
            relationship?: string;
            certAuthorityId?: string;
        }

        /**
         * Apps Start
         */

        export interface AppsData {
            title?: string;
            description?: string;
            descriptionHTML?: string;
            summary?: string;
            installs?: string;
            minInstalls?: number;
            maxInstalls?: number;
            score?: number;
            scoreText?: string;
            ratings?: number;
            reviews?: number;
            histogram?: Histogram;
            price?: number;
            free?: boolean;
            currency?: string;
            priceText?: string;
            available?: boolean;
            offersIAP?: boolean;
            IAPRange?: string;
            androidVersion?: string;
            androidVersionText?: string;
            androidMaxVersion?: string;
            developer?: string;
            developerId?: string;
            developerEmail?: string;
            developerWebsite?: string;
            developerLegalName?: string;
            developerLegalEmail?: string;
            developerLegalAddress?: string;
            developerLegalPhoneNumber?: string;
            privacyPolicy?: string;
            developerInternalID?: string;
            genre?: string;
            genreId?: string;
            categories?: Category[];
            features?: Feature[];
            icon?: string;
            headerImage?: string;
            screenshots?: string[];
            video?: string;
            videoImage?: string;
            previewVideo?: string;
            contentRating?: string;
            contentRatingDescription?: string;
            adSupported?: boolean;
            released?: string;
            updated?: number;
            version?: string;
            recentChanges?: string;
            comments?: any[];
            preregister?: boolean;
            earlyAccessEnabled?: boolean;
            isAvailableInPlayPass?: boolean;
            appId?: string;
            url?: string;
        }

        export interface Histogram {
            "1"?: number;
            "2"?: number;
            "3"?: number;
            "4"?: number;
            "5"?: number;
        }

        export interface Category {
            name?: string;
            id?: string;
        }

        export interface Feature {
            title?: string;
            description?: string;
        }

        /**
         * Apps End
         */

        export interface AppPermissionsData {
            permission?: string;
            type?: string;
        }

        /**
         * Reviews Start
         */

        export interface ReviewResponse {
            data: ReviewData[];
            nextPaginationToken: string;
        }

        export interface ReviewData {
            id: string;
            userName: string;
            userImage: string;
            date: string;
            score: number;
            scoreText: string;
            url: string;
            title: string;
            text: string;
            replyDate: string;
            replyText: string;
            version: string;
            thumbsUp: number;
            criterias: ReviewCriteria[];
        }

        export interface ReviewCriteria {
            criteria: string;
            rating: number;
        }

        /**
         * Reviews End
         */

        export interface SearchData {
            url: string;
            appId: string;
            summary: string;
            title: string;
            developer: string;
            developerId: string;
            icon: string;
            score: number;
            scoreText: string;
            priceText: string;
            free: boolean;
        }

        export interface SimilarAppsData {
            url: string;
            appId: string;
            summary: string;
            developer: string;
            developerId: string;
            icon: string;
            score: number;
            scoreText: string;
            priceText: string;
            free: boolean;
        }
    }
}
