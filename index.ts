import { SQLWrapper, sql } from "drizzle-orm";
import { QueryResult } from "pg";
import { Pagination } from "./index.d";

// Define interfaces for database adapters
export interface DrizzleDb {
  execute: <T = unknown>(query: SQLWrapper | string) => Promise<T>;
}

// Interface for PostgreSQL Database
export interface PostgresDb {
  $client: {
    query: (sql: string) => Promise<QueryResult<Record<string, unknown>>>;
  };
}

// Interface for Drizzle Query Builder with limit/offset methods
export interface DrizzleQueryBuilder extends SQLWrapper {
  limit: (limit: number) => DrizzleQueryBuilder;
  offset: (offset: number) => DrizzleQueryBuilder;
  orderBy: (column: string | SQLWrapper, direction?: "asc" | "desc") => DrizzleQueryBuilder;
}

// Type guard for PostgreSQL database
function isPostgresDb(db: unknown): db is PostgresDb {
  return typeof db === "object" && db !== null && "$client" in db && typeof (db as PostgresDb).$client?.query === "function";
}

// Type guard to check if result has rows property
function hasRows(result: unknown): result is { rows: Array<Record<string, unknown>> } {
  return typeof result === "object" && result !== null && "rows" in result && Array.isArray((result as { rows: unknown }).rows);
}

// Type guard to check if query is a Drizzle Query Builder with limit/offset methods
function isDrizzleQueryBuilder(query: unknown): query is DrizzleQueryBuilder {
  return typeof query === "object" && query !== null && "limit" in query && "offset" in query && typeof (query as DrizzleQueryBuilder).limit === "function" && typeof (query as DrizzleQueryBuilder).offset === "function";
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
}

export type MapperFunction<T> = (item: Record<string, unknown>) => T;

/**
 * Paginator class for Drizzle ORM with a fluent API similar to Laravel's paginator
 * Works with both SQLWrapper and relational queries
 */
export class DrizzlePaginator<T = Record<string, unknown>> {
  private baseQuery: SQLWrapper | DrizzleQueryBuilder;
  private currentPage: number = 1;
  private itemsPerPage: number = 10;
  private sortBy: string | null = null;
  private sortDirection: "ASC" | "DESC" = "ASC";
  private mapper: MapperFunction<T> | null = null;
  private allowedColumns: string[] = [];
  private countColumn: string = "*";
  private dbAdapter: DrizzleDb;
  private isDirectQuery: boolean = false;

  /**
   * Create a new paginator instance with a Drizzle query builder
   *
   * @param db - The database instance (can be Drizzle or PostgreSQL)
   * @param query - The Drizzle query builder object or relational query
   * @param countColumn - Column to use for count (defaults to "*")
   */
  constructor(db: DrizzleDb | PostgresDb | unknown, query: SQLWrapper | DrizzleQueryBuilder | unknown, countColumn: string = "*") {
    // Create an appropriate database adapter based on the type
    if (typeof (db as DrizzleDb).execute === "function") {
      // It's already a DrizzleDb
      this.dbAdapter = db as DrizzleDb;
    } else if (isPostgresDb(db)) {
      // It's a PostgreSQL database, create an adapter
      this.dbAdapter = {
        execute: async <T>(query: SQLWrapper | string): Promise<T> => {
          const sqlText = typeof query === "string" ? query : query.getSQL().toString();
          return db.$client.query(sqlText) as unknown as T;
        },
      };
    } else {
      // Unsupported database type
      throw new Error("Unsupported database implementation. Please provide a DrizzleDb or PostgreSQL database.");
    }

    // Check if this is a direct query with limit/offset methods
    this.isDirectQuery = isDrizzleQueryBuilder(query);

    // Handle both SQLWrapper and relational queries
    if (typeof query === "object" && query !== null && "getSQL" in query) {
      this.baseQuery = query as SQLWrapper;
    } else {
      // Convert relational query to SQL using type assertion
      this.baseQuery = query as unknown as SQLWrapper;
    }

    this.countColumn = countColumn;
  }

  /**
   * Set the page number
   */
  page(page: number): this {
    this.currentPage = Math.max(1, page);
    return this;
  }

  /**
   * Set the number of items per page
   */
  perPage(count: number): this {
    this.itemsPerPage = Math.max(1, count);
    return this;
  }

  /**
   * Set the sort column and direction
   */
  orderBy(column: string, direction: "asc" | "desc" = "asc"): this {
    // Check if column is allowed or use default
    this.sortBy = this.allowedColumns.length === 0 || this.allowedColumns.includes(column) ? column : "id";
    this.sortDirection = direction.toUpperCase() as "ASC" | "DESC";
    return this;
  }

  /**
   * Set allowed columns for sort
   */
  allowColumns(columns: string[]): this {
    this.allowedColumns = columns;
    return this;
  }

  /**
   * Set a function to map the results
   */
  map<R>(mapperFn: (item: Record<string, unknown>) => R): DrizzlePaginator<R> {
    this.mapper = mapperFn as unknown as MapperFunction<T>;
    return this as unknown as DrizzlePaginator<R>;
  }

  /**
   * Execute the query and return paginated results
   */
  async paginate(perPage?: number): Promise<PaginationResult<T>> {
    // Update per page if provided
    if (perPage !== undefined) {
      this.itemsPerPage = Math.max(1, perPage);
    }

    // Calculate offset
    const offset = (this.currentPage - 1) * this.itemsPerPage;

    // Handle different query types
    if (this.isDirectQuery && isDrizzleQueryBuilder(this.baseQuery)) {
      return this.paginateDirectQuery(offset);
    } else {
      return this.paginateSubqueryStyle(offset);
    }
  }

  /**
   * Execute pagination using direct query methods (limit/offset)
   */
  private async paginateDirectQuery(offset: number): Promise<PaginationResult<T>> {
    if (!isDrizzleQueryBuilder(this.baseQuery)) {
      throw new Error("Expected a Drizzle query builder with limit/offset methods");
    }

    // Clone the base query for count to avoid modifying the original
    const baseQuery = this.baseQuery.getSQL();
    const countQuery = sql`SELECT COUNT(${sql.raw(this.countColumn)}) as count FROM (${baseQuery}) as subquery`;

    // Create data query using direct methods
    let dataQuery = this.baseQuery;

    // Apply sorting only if orderBy was called
    if (this.sortBy !== null) {
      dataQuery = dataQuery.orderBy(sql.raw(this.sortBy as string), this.sortDirection.toLowerCase() as "asc" | "desc");
    }

    // Apply pagination
    dataQuery = dataQuery.limit(this.itemsPerPage).offset(offset);

    // Execute queries: use the adapter for count, but direct query for data
    const [countResult, dataResult] = await Promise.all([this.dbAdapter.execute(countQuery), dataQuery]);

    // Get total count
    let totalItems = 0;
    console.log("countResult", countResult);
    if (hasRows(countResult) && countResult.rows[0]?.count !== undefined) {
      totalItems = Number(countResult.rows[0].count);
    }

    // Process data result
    let data: T[] = [];
    if (Array.isArray(dataResult)) {
      // Direct query result might already be an array
      data = this.mapper ? dataResult.map((row) => this.mapper!(row as Record<string, unknown>)) : (dataResult as unknown as T[]);
    } else if (hasRows(dataResult)) {
      // Or it might have a rows property
      const rows = dataResult.rows as Record<string, unknown>[];
      data = this.mapper ? rows.map((row) => this.mapper!(row)) : (rows as unknown as T[]);
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);

    return {
      data,
      total: totalItems,
      perPage: this.itemsPerPage,
      currentPage: this.currentPage,
      lastPage: totalPages,
      from: offset + 1,
      to: offset + data.length,
    };
  }

  /**
   * Execute pagination using subquery style (original method)
   */
  private async paginateSubqueryStyle(offset: number): Promise<PaginationResult<T>> {
    // Use the provided query builder as a subquery
    const countQuery = sql`SELECT COUNT(${sql.raw(this.countColumn)}) as count FROM (${this.baseQuery}) as subquery`;

    // Only include ORDER BY if explicitly set
    let dataQuery;
    if (this.sortBy !== null) {
      dataQuery = sql`
        SELECT * FROM (${this.baseQuery}) as subquery
        ORDER BY ${sql.raw(this.sortBy)} ${sql.raw(this.sortDirection)}
        LIMIT ${this.itemsPerPage} OFFSET ${offset}
      `;
    } else {
      dataQuery = sql`
        SELECT * FROM (${this.baseQuery}) as subquery
        LIMIT ${this.itemsPerPage} OFFSET ${offset}
      `;
    }

    // Execute queries
    const [countResult, dataResult] = await Promise.all([this.dbAdapter.execute(countQuery), this.dbAdapter.execute(dataQuery)]);

    // Get total count
    let totalItems = 0;
    if (hasRows(countResult) && countResult.rows[0]?.count !== undefined) {
      totalItems = Number(countResult.rows[0].count);
    }

    // Map results if mapper provided
    let data: T[] = [];
    if (hasRows(dataResult)) {
      // Safely access rows with type checking
      const rows = dataResult.rows as Record<string, unknown>[];
      data = this.mapper ? rows.map((row) => this.mapper!(row)) : (rows as unknown as T[]);
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);

    return {
      data,
      total: totalItems,
      perPage: this.itemsPerPage,
      currentPage: this.currentPage,
      lastPage: totalPages,
      from: offset + 1,
      to: offset + data.length,
    };
  }
}

export const withSqlPagination = <T>(queryResult: QueryResult<T[]>, perPage: number, page: number): Pagination<T[]> => {
  const totalItems = queryResult.rowCount ?? 0;
  const offset = (page - 1) * perPage;
  const data = queryResult.rows.slice(offset, offset + perPage) as T[];
  const totalPages = Math.ceil(totalItems / perPage);
  const pagination = {
    total: totalItems,
    perPage,
    currentPage: page,
    lastPage: totalPages,
    from: offset + 1,
    to: offset + data.length,
  };

  return {
    ...pagination,
    data,
  };
};
