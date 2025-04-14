# Changelog

All notable changes to the `@skmirajbn/drizzle-paginator` package will be documented in this file.

## [1.0.5] - 2025-04-07

### Fixed
- Improved compatibility with node-postgres databases
- Added specific support for PostgreSQL client implementation
- Fixed type compatibility issues between different drizzle-orm versions
- Enhanced type safety with proper generics for execute method

## [1.0.4] - 2025-04-06

### Fixed
- Fixed TypeScript compatibility issues when using with different Drizzle ORM versions
- Made DrizzleDb interface more flexible to support various database implementations

## [1.0.2] - 2025-04-06

### Changed
- Renamed `DrizzlePaginatorService` to `DrizzlePaginator` for simpler naming

## [1.0.0] - 2025-04-06

### Added
- Initial release of the Drizzle Paginator
- `DrizzlePaginator` class for paginating Drizzle ORM queries
- Support for both SQLWrapper and relational queries
- Fluent API for configuration
- Customizable sorting
- Data mapping functionality
- `withSqlPagination` utility for raw SQL query results