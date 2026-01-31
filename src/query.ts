import type { PrismaClient } from "@prisma/client/extension";
import type { apps, developers, na_apps } from "./generated/prisma/index.js";
import { isStringifiedJson } from "./utils.js";

export const insertMultipleRows = async <T>(
    tx: PrismaClient,
    tableName: string,
    columns: string[],
    rows: any[][],
): Promise<T[]> => {
    if (tableName === "developers") {
        await tx.$executeRawUnsafe("SAVEPOINT developers_insert");
    } else if (tableName === "apps") {
        await tx.$executeRawUnsafe("SAVEPOINT apps_insert");
    }
    try {
        const values: any[] = [];
        const placeholders = rows.map((row, i) => {
            const startIndex = i * columns.length + 1;
            const rowPlaceholders = columns.map((_, j) => {
                if (isStringifiedJson(row as any)) {
                    return `$${startIndex + j}::jsonb`;
                } else {
                    return `$${startIndex + j}`;
                }
            });
            values.push(...row);
            return `(${rowPlaceholders.join(", ")})`;
        });

        const query = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES ${placeholders.join(", ")}
        RETURNING *;
      `;

        console.log("Query:", query);
        console.log("values:", values);
        console.log("rows:", rows);

        const result = await tx.$executeRawUnsafe(query, ...values);
        console.log(result);
        return result as T[];
    } catch (err: any) {
        console.log(`insertMultipleRows ${tableName} => `, err);
        await tx.$executeRawUnsafe("ROLLBACK");
        if (tableName === "developers") {
            await tx.$executeRawUnsafe("ROLLBACK TO developers_insert");
            // const developerIdData = await getDeveloperId(tx, rows[0][0]);
            // return developerIdData as T[];
        } else if (tableName === "apps") {
            await tx.$executeRawUnsafe("ROLLBACK TO apps_insert");
            // const appIdData = await getAppIds(tx, rows[0][0]);
            // return appIdData as T[];
        }
        return [] as T[];
    }
};

export const insertSingleRow = async <T>(
    tx: PrismaClient,
    tableName: string,
    columns: string[],
    row: any[],
): Promise<T> => {
    if (tableName === "developers") {
        await tx.$executeRawUnsafe("SAVEPOINT developers_insert");
    } else if (tableName === "apps") {
        await tx.$executeRawUnsafe("SAVEPOINT apps_insert");
    }
    try {
        const placeholders = row.map((_, j) => {
            if (isStringifiedJson(row as any)) {
                return `$${j + 1}::jsonb`;
            } else {
                return `$${j + 1}`;
            }
        });
        const value = `(${placeholders.join(", ")})`;

        const query = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES ${value}
        RETURNING *;
      `;

        console.log("Query:", query);
        console.log("value:", value);
        console.log("row:", row);

        const result = await tx.$executeRawUnsafe(query, ...row);
        console.log(result);
        return result as T;
    } catch (err: any) {
        console.log(`insertSingleRow ${tableName} => `, err);
        await tx.$executeRawUnsafe("ROLLBACK");
        if (tableName === "developers") {
            await tx.$executeRawUnsafe("ROLLBACK TO developers_insert");
            // const developerIdData = await getDeveloperId(tx, row[0]);
            // return developerIdData as T;
        } else if (tableName === "apps") {
            await tx.$executeRawUnsafe("ROLLBACK TO apps_insert");
            // const appIdData = await getAppIds(tx, row[0]);
            // return appIdData as T;
        }
        return {} as T;
    }
};

export const getDeveloperId = async (
    tx: PrismaClient,
    developerId: string,
): Promise<developers> => {
    try {
        const result = await tx.developers.findUnique({
            where: { developer_id: developerId },
        });
        return result as developers;
    } catch (err: any) {
        console.log("error in getDeveloperId", err.message);
        return {} as developers;
    }
};

export const getAppByAppId = async (
    tx: PrismaClient,
    appId: string,
): Promise<apps> => {
    try {
        const result = await tx.apps.findUnique({
            where: { app_id: appId },
        });
        return result as apps;
    } catch (err: any) {
        console.log("error in getAppByAppId", err.message);
        return {} as apps;
    }
};

export const getNAAppByAppId = async (
    tx: PrismaClient,
    appId: string,
): Promise<na_apps> => {
    try {
        const result = await tx.na_apps.findUnique({
            where: { app_id: appId },
        });
        return result as na_apps;
    } catch (err: any) {
        console.log("error in getNAAppByAppId", err.message);
        return {} as na_apps;
    }
};

export const upsertDeveloper = async (
    tx: PrismaClient,
    developerData: Partial<developers>,
): Promise<developers> => {
    try {
        const result = await tx.developers.upsert({
            where: { developer_id: developerData.developer_id! },
            create: developerData,
            update: developerData,
        });
        return result as developers;
    } catch (err: any) {
        console.log("error in upsertDeveloper", err.message);
        return {} as developers;
    }
};

export const getDeveloperByDeveloperId = async (
    tx: PrismaClient,
    developerId: string,
): Promise<developers> => {
    try {
        const result = await tx.developers.findUnique({
            where: { developer_id: developerId },
        });
        return result as developers;
    } catch (err) {
        return {} as developers;
    }
};

export const getOldInstalls = async (
    tx: PrismaClient,
    appId: number,
): Promise<bigint> => {
    if (!appId) return 0n;
    try {
        const result = await tx.installs.findMany({
            select: { current_installs: true },
            where: { app_id: appId },
            orderBy: { created_at: "desc" },
            take: 1,
        });
        if (result.length === 0) return 0n;
        return result[0]?.current_installs as bigint;
    } catch (err) {
        return 0n;
    }
};

export const getAppIds = async (
    tx: PrismaClient,
    appIds: string[],
): Promise<string[]> => {
    if (appIds.length === 0) return [];

    try {
        const result = await tx.apps.findMany({
            where: { app_id: { in: appIds } },
            select: { app_id: true },
        });
        return result.map((row: apps) => row.app_id);
    } catch (err: any) {
        console.log("error in getAppIds", err.message);
        return [];
    }
};

// Note - for testing purposes only
export const getTestingAppIds = async (tx: PrismaClient): Promise<apps[]> => {
    try {
        const result = await tx.$queryRaw`
            SELECT app_id
            FROM apps
            ORDER BY RANDOM()
            LIMIT 5
        `;
        if (result.length === 0) return [];
        return result as apps[];
    } catch (err) {
        console.log("error in getTestingAppIds", err);
        return [];
    }
};
