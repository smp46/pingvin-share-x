import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Collection, MongoClient } from "mongodb";
import {
  AuditDoc,
  AuditEventInput,
  computeHash,
  GENESIS_HASH,
  verifyDocs,
} from "./auditChain.util";

export type { AuditAction } from "./auditChain.util";

@Injectable()
export class AuditService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private client?: MongoClient;
  private collectionPromise?: Promise<Collection<AuditDoc> | null>;
  private queue: Promise<void> = Promise.resolve();
  private prevHash = GENESIS_HASH;
  private seq = 0;
  private failedLogged = false;

  get enabled(): boolean {
    return !!process.env.MONGODB_URI;
  }

  private reportFailure(e: unknown) {
    if (this.failedLogged) return;
    this.failedLogged = true;
    // Message only: driver errors can echo the connection string.
    const msg = String((e as Error)?.message ?? e).replace(
      /mongodb(\+srv)?:\/\/\S+/g,
      "<uri>",
    );
    this.logger.warn(`Audit log unavailable: ${msg}`);
  }

  private getCollection(): Promise<Collection<AuditDoc> | null> {
    if (!this.enabled) return Promise.resolve(null);
    this.collectionPromise ??= (async () => {
      try {
        const uri = process.env.MONGODB_URI as string;
        this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
        await this.client.connect();
        const col = this.client
          .db()
          .collection<AuditDoc>("audit_events");
        await col.createIndex({ seq: 1 }, { unique: true });
        const last = await col.find().sort({ seq: -1 }).limit(1).next();
        if (last) {
          this.prevHash = last.hash;
          this.seq = last.seq;
        }
        return col;
      } catch (e) {
        this.reportFailure(e);
        this.collectionPromise = undefined; // retry on a later event
        await this.client?.close().catch(() => undefined);
        this.client = undefined;
        return null;
      }
    })();
    return this.collectionPromise;
  }

  /** Fire-and-forget; never throws. */
  log(event: AuditEventInput): void {
    if (!this.enabled) return;
    const ts = new Date().toISOString();
    this.queue = this.queue
      .then(async () => {
        const col = await this.getCollection();
        if (!col) return;
        const base = {
          seq: this.seq + 1,
          ts,
          action: event.action,
          shareId: event.shareId,
          userId: event.userId,
          ipHash: event.ipHash,
          detail: event.detail,
          prevHash: this.prevHash,
        };
        const doc = JSON.parse(
          JSON.stringify({ ...base, hash: computeHash(base) }),
        ) as AuditDoc;
        try {
          await col.insertOne({ ...doc });
          this.seq = doc.seq;
          this.prevHash = doc.hash;
        } catch (e) {
          this.reportFailure(e);
          // Force re-seed from DB on next append (e.g. seq collision).
          this.collectionPromise = undefined;
          await this.client?.close().catch(() => undefined);
          this.client = undefined;
        }
      })
      .catch((e) => this.reportFailure(e));
  }

  async recent(limit = 50) {
    const col = await this.getCollection();
    if (!col) return [];
    const n = Math.min(Math.max(Math.floor(limit) || 50, 1), 500);
    return col
      .find({}, { projection: { _id: 0 } })
      .sort({ seq: -1 })
      .limit(n)
      .toArray();
  }

  async verifyChain(limit = 500) {
    const col = await this.getCollection();
    if (!col) return { ok: false, checked: 0 };
    await this.queue; // let pending appends land first
    const n = Math.min(Math.max(Math.floor(limit) || 500, 1), 10000);
    const docs = (
      await col
        .find({}, { projection: { _id: 0 } })
        .sort({ seq: -1 })
        .limit(n)
        .toArray()
    ).reverse();
    return verifyDocs(docs);
  }

  async onModuleDestroy() {
    await this.client?.close().catch(() => undefined);
  }
}
