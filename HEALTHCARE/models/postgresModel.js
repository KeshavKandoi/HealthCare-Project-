import { randomUUID } from 'node:crypto';
import { getPool } from '../config/db.js';

const tables = new Set(['app_users', 'doctors', 'appointments', 'health_records', 'ecg_records', 'web_messages']);

function makeWhere(filter = {}) {
  const values = [];
  const clauses = [];
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    if (key === '_id' || key === 'id') {
      values.push(String(value));
      clauses.push(`id = $${values.length}`);
    } else {
      values.push(key, String(value));
      clauses.push(`data ->> $${values.length - 1} = $${values.length}`);
    }
  }
  return { sql: clauses.length ? ` where ${clauses.join(' and ')}` : '', values };
}

function unwrap(row, Model) {
  return row ? new Model({ ...row.data, _id: row.id }) : null;
}

export function createPostgresModel(table) {
  if (!tables.has(table)) throw new Error('Unknown PostgreSQL table');

  class Model {
    constructor(data = {}) {
      const defaults = table === 'app_users' ? { isAdmin: false }
        : table === 'doctors' ? { available: true }
          : table === 'appointments' ? { status: 'pending', payment: false }
            : table === 'ecg_records' ? { status: 'normal', timestamp: new Date().toISOString() }
              : {};
      Object.assign(this, defaults, data);
    }

    async save() {
      const now = new Date().toISOString();
      this._id ||= randomUUID();
      this.createdAt ||= now;
      this.updatedAt = now;
      const { rows } = await getPool().query(
        `insert into ${table} (id, data) values ($1, $2::jsonb)
         on conflict (id) do update set data = excluded.data returning id, data`,
        [this._id, JSON.stringify(this)],
      );
      Object.assign(this, rows[0].data);
      return this;
    }

    async updateOne(update) { return Model.findByIdAndUpdate(this._id, update); }
    static async create(data) { return new Model(data).save(); }
    static find(filter = {}) { return new Query(Model, table, filter); }

    static async findOne(filter = {}) {
      const where = makeWhere(filter);
      const { rows } = await getPool().query(`select id, data from ${table}${where.sql} limit 1`, where.values);
      return unwrap(rows[0], Model);
    }

    static findById(id) { return Model.findOne({ _id: id }); }

    static async findByIdAndUpdate(id, update) {
      const patch = update.$set || update;
      const clean = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
      clean.updatedAt = new Date().toISOString();
      const { rows } = await getPool().query(
        `update ${table} set data = data || $2::jsonb where id = $1 returning id, data`,
        [String(id), JSON.stringify(clean)],
      );
      return unwrap(rows[0], Model);
    }

    static async findByIdAndDelete(id) {
      const { rows } = await getPool().query(`delete from ${table} where id = $1 returning id, data`, [String(id)]);
      return unwrap(rows[0], Model);
    }

    static async aggregate() {
      if (table !== 'appointments') throw new Error('Aggregate unavailable for this model');
      const { rows } = await getPool().query("select coalesce(sum(case when data->>'amount' ~ '^[0-9]+(\\.[0-9]+)?$' then (data->>'amount')::numeric else 0 end), 0) as total from appointments");
      return [{ totalEarning: Number(rows[0].total) }];
    }
  }
  return Model;
}

class Query {
  constructor(Model, table, filter) {
    this.Model = Model;
    this.table = table;
    this.filter = filter;
    this.order = null;
    this.max = null;
    this.relations = [];
  }

  sort(order) { this.order = order; return this; }
  limit(max) { this.max = max; return this; }
  populate(field, projection) { this.relations.push({ field, projection }); return this; }

  async run() {
    const where = makeWhere(this.filter);
    const allowedSort = new Set(['createdAt', 'updatedAt', 'timestamp']);
    const sortKey = Object.keys(this.order || {})[0];
    const sort = allowedSort.has(sortKey) ? ` order by data ->> '${sortKey}' ${this.order[sortKey] < 0 ? 'desc' : 'asc'}` : '';
    const limit = Number.isInteger(this.max) && this.max > 0 ? ` limit ${Math.min(this.max, 1000)}` : '';
    const { rows } = await getPool().query(`select id, data from ${this.table}${where.sql}${sort}${limit}`, where.values);
    const documents = rows.map(row => unwrap(row, this.Model));
    for (const { field, projection } of this.relations) {
      const Related = field === 'userId' ? createPostgresModel('app_users') : field === 'doctorId' ? createPostgresModel('doctors') : null;
      if (!Related) throw new Error(`Unknown relation ${field}`);
      await Promise.all(documents.map(async document => {
        if (!document[field]) return;
        const related = await Related.findById(document[field]);
        document[field] = related && projection
          ? Object.fromEntries(['_id', ...projection.split(/\s+/)].map(key => [key, related[key]]))
          : related;
      }));
    }
    return documents;
  }

  then(resolve, reject) { return this.run().then(resolve, reject); }
}
