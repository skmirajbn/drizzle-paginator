import { SQLWrapper } from "drizzle-orm";
import { QueryResult } from "pg";

export type Pagination<T> = {
  data: T;
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
};

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

export interface DrizzleDb {
  execute: <T = unknown>(query: SQLWrapper | string) => Promise<T>;
}

export interface PostgresDb {
  $client: {
    query: (sql: string) => Promise<QueryResult<Record<string, unknown>>>;
  };
}

export declare class DrizzlePaginator<T = Record<string, unknown>> {
  constructor(db: DrizzleDb | PostgresDb | unknown, query: SQLWrapper | unknown, countColumn?: string);
  page(page: number): this;
  perPage(count: number): this;
  orderBy(column: string, direction?: "asc" | "desc"): this;
  allowColumns(columns: string[]): this;
  map<R>(mapperFn: (item: Record<string, unknown>) => R): DrizzlePaginator<R>;
  paginate(perPage?: number): Promise<PaginationResult<T>>;
}

export declare function withSqlPagination<T>(
  queryResult: QueryResult<T[]>, 
  perPage: number, 
  page: number
): Pagination<T[]>;
