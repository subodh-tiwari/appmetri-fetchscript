import pkg from "pg";
import { isStringifiedJson } from "./utils.js";
const { Pool } = pkg;

export const poolGPS = new Pool({
  user: 'admin',
  password: 'Tiwari@71',
  host: '35.225.64.69',
  port: 5432,
  database: "google_play_store",
});

export const poolAppMetri = new Pool({
  user: 'admin',
  password: 'Tiwari@71',
  host: '35.225.64.69',
  port: 5432,
  database: "appmetri",
});

export const getAllAppIds = async (limit, offset) => {
  const clientAppMetri = await poolAppMetri.connect();
  try {
    const result = await clientAppMetri.query(
      "SELECT app_id FROM app_ids ORDER BY id DESC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    return result.rows;
  } catch (err) {
    return [{}];
  } finally {
    clientAppMetri.release();
  }
};

export const insertMultipleRows = async (
  clientGPS,
  tableName,
  columns,
  rows
) => {
  if (tableName === "developers") {
    await clientGPS.query("SAVEPOINT developers_insert");
  } else if (tableName === "apps") {
    await clientGPS.query("SAVEPOINT apps_insert");
  }
  try {
    const values = [];
    const placeholders = rows.map((row, i) => {
      const startIndex = i * columns.length + 1;
      const rowPlaceholders = columns.map((_, j) => {
        if (isStringifiedJson(row)) {
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

    const result = await clientGPS.query(query, values);
    return result.rows;
  } catch (err) {
    console.log(
      `insertMultipleRows ${tableName} => `,
      err.message.split("\n")[0]
    );
    if (tableName === "developers") {
      await clientGPS.query("ROLLBACK TO developers_insert");
      const developerIdData = await getDeveloperId(clientGPS, rows[0][0]);
      return developerIdData;
    } else if (tableName === "apps") {
      await clientGPS.query("ROLLBACK TO apps_insert");
      const appIdData = await getAppId(clientGPS, rows[0][0]);
      return appIdData;
    }
    return [];
  }
};

const getDeveloperId = async (clientGPS, developerId) => {
  try {
    const result = await clientGPS.query(
      "SELECT * FROM developers WHERE developer_id = $1",
      [developerId]
    );
    return result.rows;
  } catch (err) {
    return [{}];
  }
};

export const getAppId = async (clientGPS, appId) => {
  try {
    const result = await clientGPS.query(
      "SELECT * FROM apps WHERE app_id = $1",
      [appId]
    );
    return result.rows;
  } catch (err) {
    return [{}];
  }
};

export const getAppByAppId = async (clientGPS, appId) => {
  try {
    const result = await clientGPS.query(
      "SELECT * FROM apps WHERE app_id = $1",
      [appId]
    );
    return result.rows[0];
  } catch (err) {
    console.log("error in getAppByAppId", err.message);
    return {};
  }
};

export const getNAAppByAppId = async (clientGPS, appId) => {
  try {
    const result = await clientGPS.query(
      "SELECT * FROM na_apps WHERE app_id = $1",
      [appId]
    );
    return result.rows[0];
  } catch (err) {
    console.log("error in getNAAppByAppId", err.message);
    return {};
  }
};

export const getDeveloperByDeveloperId = async (clientGPS, developerId) => {
  try {
    const result = await clientGPS.query(
      "SELECT * FROM developers WHERE developer_id = $1",
      [developerId]
    );
    return result.rows;
  } catch (err) {
    return [];
  }
};

export const getOldInstalls = async (clientGPS, appId) => {
  try {
    const result = await clientGPS.query(
      "SELECT current_installs FROM installs WHERE app_id = $1 ORDER BY created_at DESC LIMIT 1",
      [appId]
    );
    return result.rows[0].current_installs;
  } catch (err) {
    return 0;
  }
};

export const getAppIds = async (clientGPS, appIds) => {
  try {
    const result = await clientGPS.query(
      "SELECT app_id FROM apps WHERE app_id = ANY($1::text[])",
      [appIds]
    );
    return result.rows.map((row) => row.app_id);
  } catch (err) {
    return [];
  }
};

