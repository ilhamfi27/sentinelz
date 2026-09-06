import type { Knex } from "knex";
import { Helper, Model } from "casbin";
import { CasbinAdapter } from "./adapter.abstract";
import { CasbinRuleRow, SqlAdapterConfig } from "../core/types";
import { AdapterInitializationError, MigrationError } from "../core/errors";
import { ensureCasbinRuleTable } from "../migrations/sql/create-casbin-rule";
import { logger } from "../utils/logger";
import { DEFAULT_TABLE_NAME, RULE_COLUMNS, RuleColumn } from "../constants/db";
import { ruleRowFromArgs } from "../utils/db.adapter";

export class SqlCasbinAdapter extends CasbinAdapter {
  private readonly db: Knex;
  private readonly tableName: string;
  private readonly schema?: string;
  private readonly createSchemaIfMissing: boolean;
  private readonly client: SqlAdapterConfig["client"];

  constructor(config: SqlAdapterConfig) {
    super();
    this.tableName = config.tableName ?? DEFAULT_TABLE_NAME;
    this.schema = config.schema;
    this.createSchemaIfMissing = config.createSchemaIfMissing ?? false;
    this.client = config.client;

    if (
      this.schema &&
      (config.client === "sqlite3" || config.client === "mysql2")
    ) {
      logger.warn(
        `SqlAdapterConfig.schema is ignored for client "${config.client}" (no schema concept)`,
      );
    }

    let knexFactory: (config: Knex.Config) => Knex;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      knexFactory = require("knex");
    } catch {
      throw new AdapterInitializationError(
        'The "knex" package is required for the sql adapter. Install it with `npm install knex` ' +
          "plus the driver for your dialect (pg/mysql2/sqlite3/tedious).",
      );
    }

    this.db = knexFactory({
      client: config.client,
      connection: config.connection,
      useNullAsDefault: config.client === "sqlite3",
    });
  }

  private get effectiveSchema(): string | undefined {
    if (this.client === "sqlite3" || this.client === "mysql2") return undefined;
    return this.schema;
  }

  private table(): Knex.QueryBuilder<CasbinRuleRow, CasbinRuleRow[]> {
    const qb = this.db<CasbinRuleRow>(this.tableName);
    const schema = this.effectiveSchema;
    return schema ? qb.withSchema(schema) : qb;
  }

  async migrate(): Promise<void> {
    try {
      await ensureCasbinRuleTable(this.db, {
        tableName: this.tableName,
        schema: this.effectiveSchema,
        createSchemaIfMissing: this.createSchemaIfMissing,
        client: this.client,
      });
    } catch (err) {
      throw new MigrationError(
        `Failed to run sql adapter migration: ${(err as Error).message}`,
      );
    }
  }

  async loadPolicy(model: Model): Promise<void> {
    const rows = await this.table().select();
    for (const row of rows) {
      const line = [row.ptype, ...RULE_COLUMNS.map((col) => row[col])]
        .filter((value) => value !== undefined && value !== null)
        .join(", ");
      Helper.loadPolicyLine(line, model);
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    const rows: CasbinRuleRow[] = [];
    for (const sec of ["p", "g"]) {
      const astMap = model.model.get(sec);
      if (!astMap) continue;
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          rows.push(ruleRowFromArgs(ptype, rule));
        }
      }
    }

    await this.table().del();
    if (rows.length > 0) {
      await this.table().insert(rows);
    }
    return true;
  }

  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.table().insert(ruleRowFromArgs(ptype, rule));
  }

  async removePolicy(
    _sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    const row = ruleRowFromArgs(ptype, rule);
    let qb = this.table().where({ ptype: row.ptype });
    for (const col of RULE_COLUMNS) {
      const value = row[col];
      if (value !== undefined) {
        qb = qb.andWhere(col, value);
      }
    }
    await qb.del();
  }

  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    let qb = this.table().where({ ptype });
    fieldValues.forEach((value, i) => {
      const columnIndex = fieldIndex + i;
      if (
        value !== undefined &&
        value !== "" &&
        columnIndex < RULE_COLUMNS.length
      ) {
        qb = qb.andWhere(RULE_COLUMNS[columnIndex] as RuleColumn, value);
      }
    });
    await qb.del();
  }

  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    for (const rule of rules) {
      await this.removePolicy(sec, ptype, rule);
    }
  }

  async close(): Promise<void> {
    await this.db.destroy();
  }
}
