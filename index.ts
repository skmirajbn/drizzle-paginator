import { SQLWrapper, sql } from "drizzle-orm";
import { Pagination } from "./index.d";
import { QueryResult } from "pg";

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

// Type guard for PostgreSQL database
function isPostgresDb(db: unknown): db is PostgresDb {
  return typeof db === 'object' && 
         db !== null && 
         '$client' in db &&
         typeof (db as PostgresDb).$client?.query === 'function';
}

// Type guard to check if result has rows property
function hasRows(result: unknown): result is { rows: Array<Record<string, unknown>> } {
  return typeof result === 'object' && 
         result !== null && 
         'rows' in result && 
         Array.isArray((result as { rows: unknown }).rows);
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
  private baseQuery: SQLWrapper;
  private currentPage: number = 1;
  private itemsPerPage: number = 10;
  private sortBy: string = "id";
  private sortDirection: "ASC" | "DESC" = "ASC";
  private mapper: MapperFunction<T> | null = null;
  private allowedColumns: string[] = [];
  private countColumn: string = "*";
  private dbAdapter: DrizzleDb;

  /**
   * Create a new paginator instance with a Drizzle query builder
   *
   * @param db - The database instance (can be Drizzle or PostgreSQL)
   * @param query - The Drizzle query builder object or relational query
   * @param countColumn - Column to use for count (defaults to "*")
   */
  constructor(db: DrizzleDb | PostgresDb | unknown, query: SQLWrapper | unknown, countColumn: string = "*") {
    // Create an appropriate database adapter based on the type
    if (typeof (db as DrizzleDb).execute === 'function') {
      // It's already a DrizzleDb
      this.dbAdapter = db as DrizzleDb;
    } else if (isPostgresDb(db)) {
      // It's a PostgreSQL database, create an adapter
      this.dbAdapter = {
        execute: async <T>(query: SQLWrapper | string): Promise<T> => {
          const sqlText = typeof query === 'string' ? query : query.getSQL().toString();
          return db.$client.query(sqlText) as unknown as T;
        }
      };
    } else {
      // Unsupported database type
      throw new Error('Unsupported database implementation. Please provide a DrizzleDb or PostgreSQL database.');
    }
    
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

    // Use the provided query builder as a subquery
    const countQuery = sql`SELECT COUNT(${sql.raw(this.countColumn)}) as count FROM (${this.baseQuery}) as subquery`;

    const dataQuery = sql`
      SELECT * FROM (${this.baseQuery}) as subquery
      ORDER BY ${sql.raw(this.sortBy)} ${sql.raw(this.sortDirection)}
      LIMIT ${this.itemsPerPage} OFFSET ${offset}
    `;

    // Execute queries
    const [countResult, dataResult] = await Promise.all([
      this.dbAdapter.execute(countQuery), 
      this.dbAdapter.execute(dataQuery)
    ]);

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
      data = this.mapper 
        ? rows.map(row => this.mapper!(row))
        : rows as unknown as T[];
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
