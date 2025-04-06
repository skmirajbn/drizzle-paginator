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

export type DrizzleDb = {
  execute: (query: SQLWrapper) => Promise<{ rows: Record<string, unknown>[] }>;
};

export declare class DrizzlePaginatorService<T = Record<string, unknown>> {
  constructor(db: DrizzleDb, query: SQLWrapper | unknown, countColumn?: string);
  page(page: number): this;
  perPage(count: number): this;
  orderBy(column: string, direction?: "asc" | "desc"): this;
  allowColumns(columns: string[]): this;
  map<R>(mapperFn: (item: Record<string, unknown>) => R): DrizzlePaginatorService<R>;
  paginate(perPage?: number): Promise<PaginationResult<T>>;
}

export declare function withSqlPagination<T>(
  queryResult: QueryResult<T[]>, 
  perPage: number, 
  page: number
): Pagination<T[]>;
