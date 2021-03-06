import sqlite3 from "sqlite3";
import { migrations, Migration } from "./schema";

export default class Connection {
  _db: any;

  get db() {
    if (!this._db) {
      throw new Error("Database is not initialized.");
    }

    return this._db;
  }

  async initialize({ databasePath }): Promise<void> {
    this._db = new sqlite3.Database(databasePath);
    await this.migrate(migrations);
  }

  async migrate(migrations: Migration[]): Promise<void> {
    await this.exec("begin;");
    try {
      const current_version: number = await this.get(`pragma user_version`).then(row => row.user_version);
      let last_version: number = 0;
      for (const m of migrations) {
        if (m.version <= last_version) {
          throw new Error(`Wrong migration script: version ${m.version}`);
        }
        if (m.version > current_version) {
          await this.exec(m.query);
          await this.exec(`pragma user_version = ${m.version}`);
        }
        last_version = m.version;
      }
      await this.exec("commit;");
    } catch (err) {
      await this.exec("rollback;");
      throw err;
    }
  }

  exec(sql): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  get(sql, ...params): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, ...params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  all(sql, ...params): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, ...params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  insert(sql, ...params): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, ...params, function(err) {
        if (err) {
          reject(err);
        } else {
          // @ts-ignore
          resolve(this.lastID); // eslint-disable-line no-invalid-this
        }
      });
    });
  }

  run(sql, ...params): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, ...params, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export const connection = new Connection();
