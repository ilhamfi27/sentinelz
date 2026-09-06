import type { Connection, Model as MongooseModel } from "mongoose";
import { Helper, Model } from "casbin";
import { CasbinAdapter } from "./adapter.abstract";
import { CasbinRuleDoc, MongoAdapterConfig } from "../core/types";
import { AdapterInitializationError, MigrationError } from "../core/errors";
import { ensureCasbinIndexes } from "../migrations/mongo/ensure-indexes";
import {
  DEFAULT_COLLECTION_NAME,
  RULE_COLUMNS,
  RuleColumn,
} from "../constants/db";
import { docFromArgs } from "../utils/db.adapter";

export class MongoCasbinAdapter extends CasbinAdapter {
  private readonly connection: Connection;
  private readonly collectionName: string;
  private readonly model: MongooseModel<CasbinRuleDoc>;

  constructor(config: MongoAdapterConfig) {
    super();
    this.collectionName = config.collectionName ?? DEFAULT_COLLECTION_NAME;

    let mongoose: typeof import("mongoose");
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mongoose = require("mongoose");
    } catch {
      throw new AdapterInitializationError(
        'The "mongoose" package is required for the mongo adapter. Install it with `npm install mongoose`.',
      );
    }

    this.connection = mongoose.createConnection(config.uri);
    const schema = new mongoose.Schema<CasbinRuleDoc>(
      {
        ptype: { type: String, required: true },
        v0: String,
        v1: String,
        v2: String,
        v3: String,
        v4: String,
        v5: String,
      },
      { collection: this.collectionName, versionKey: false },
    );
    this.model = this.connection.model<CasbinRuleDoc>("CasbinRule", schema);
  }

  async migrate(): Promise<void> {
    try {
      await ensureCasbinIndexes(this.connection, {
        collectionName: this.collectionName,
      });
    } catch (err) {
      throw new MigrationError(
        `Failed to run mongo adapter migration: ${(err as Error).message}`,
      );
    }
  }

  async loadPolicy(model: Model): Promise<void> {
    const docs = await this.model.find().lean();
    for (const doc of docs) {
      const line = [doc.ptype, ...RULE_COLUMNS.map((col) => doc[col])]
        .filter((value) => value !== undefined && value !== null)
        .join(", ");
      Helper.loadPolicyLine(line, model);
    }
  }

  async savePolicy(model: Model): Promise<boolean> {
    const docs: CasbinRuleDoc[] = [];
    for (const sec of ["p", "g"]) {
      const astMap = model.model.get(sec);
      if (!astMap) continue;
      for (const [ptype, ast] of astMap) {
        for (const rule of ast.policy) {
          docs.push(docFromArgs(ptype, rule));
        }
      }
    }

    await this.model.deleteMany({});
    if (docs.length > 0) {
      await this.model.insertMany(docs);
    }
    return true;
  }

  async addPolicy(_sec: string, ptype: string, rule: string[]): Promise<void> {
    await this.model.create(docFromArgs(ptype, rule));
  }

  async removePolicy(
    _sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    await this.model.deleteMany(docFromArgs(ptype, rule));
  }

  async removeFilteredPolicy(
    _sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const filter: Partial<CasbinRuleDoc> = { ptype };
    fieldValues.forEach((value, i) => {
      const columnIndex = fieldIndex + i;
      if (
        value !== undefined &&
        value !== "" &&
        columnIndex < RULE_COLUMNS.length
      ) {
        filter[RULE_COLUMNS[columnIndex] as RuleColumn] = value;
      }
    });
    await this.model.deleteMany(filter);
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
    await this.connection.close();
  }
}
