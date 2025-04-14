# Drizzle Paginator

A simple, flexible pagination utility for Drizzle ORM with a fluent API inspired by Laravel's paginator.

## Installation

```bash
npm install @skmirajbn/drizzle-paginator
```

## Features

- 🔍 Works with both SQLWrapper and relational queries
- 🎯 Fluent API for easy pagination configuration
- 🔄 Sorting by any column with ASC/DESC options
- 🛠️ Custom mapper function support
- 📊 Complete pagination metadata

## Usage

### Basic Usage

```typescript
import { DrizzlePaginator } from '@skmirajbn/drizzle-paginator';
import { db } from './your-drizzle-db-setup';
import { users } from './your-schema';

// Create a basic query
const query = db.select().from(users);

// Create a paginator
const paginator = new DrizzlePaginator(db, query);

// Get paginated results
const results = await paginator
  .page(1)       // Set page number
  .perPage(10)   // Set items per page
  .paginate();

console.log(results);
// {
//   data: [...],         // Array of results
//   total: 100,          // Total records count
//   perPage: 10,         // Items per page
//   currentPage: 1,      // Current page number
//   lastPage: 10,        // Last page number
//   from: 1,             // Starting index
//   to: 10               // Ending index
// }
```

### Advanced Usage

```typescript
import { DrizzlePaginator } from '@skmirajbn/drizzle-paginator';
import { db } from './your-drizzle-db-setup';
import { users, posts } from './your-schema';
import { sql, eq } from 'drizzle-orm';

// Create a complex query
const query = db.select({
  userId: users.id,
  name: users.name,
  email: users.email,
  postCount: sql`count(${posts.id})`.as('postCount')
})
.from(users)
.leftJoin(posts, eq(users.id, posts.userId))
.groupBy(users.id, users.name, users.email);

// Create a paginator with custom options
const paginator = new DrizzlePaginator(db, query, 'userId');

// Map to a custom type
interface UserWithPostCount {
  userId: number;
  name: string;
  email: string;
  postCount: number;
}

// Get paginated results with advanced options
const results = await paginator
  .page(2)                              // Set page number
  .perPage(15)                          // Set items per page
  .allowColumns(['name', 'email'])      // Restrict sortable columns
  .orderBy('name', 'desc')              // Set sort column and direction
  .map<UserWithPostCount>((item) => ({  // Custom mapper function
    userId: Number(item.userId),
    name: String(item.name),
    email: String(item.email),
    postCount: Number(item.postCount),
  }))
  .paginate();

console.log(results);
```

### Raw SQL Pagination

You can also paginate raw SQL query results:

```typescript
import { withSqlPagination } from '@skmirajbn/drizzle-paginator';
import { pool } from './your-pg-setup';

// Execute a raw SQL query
const result = await pool.query('SELECT * FROM users');

// Paginate the results
const paginatedResults = withSqlPagination(result, 10, 1);
```

## API Reference

### `DrizzlePaginator`

#### Constructor

```typescript
constructor(db: DrizzleDb, query: SQLWrapper | unknown, countColumn: string = "*")
```

- `db`: Your Drizzle database instance
- `query`: The Drizzle query builder object or a relational query
- `countColumn`: Column to use for COUNT (defaults to "*")

#### Methods

- `page(page: number)`: Set the page number
- `perPage(count: number)`: Set the number of items per page
- `orderBy(column: string, direction: "asc" | "desc")`: Set the sort column and direction
- `allowColumns(columns: string[])`: Set allowed columns for sorting
- `map<R>(mapperFn: (item: Record<string, unknown>) => R)`: Set a function to map the results
- `paginate(perPage?: number)`: Execute the query and return paginated results

### `withSqlPagination`

```typescript
withSqlPagination<T>(queryResult: QueryResult<T[]>, perPage: number, page: number): Pagination<T[]>
```

Paginates the results of a raw SQL query.

## License

ISC 

## Contributing

We welcome contributions from the community! Drizzle Paginator is fully open source and we'd love your help to make it even better.

### Ways to Contribute

- **Reporting Bugs**: If you find a bug, please open an issue on our [GitHub repository](https://github.com/skmirajbn/drizzle-paginator/issues).
- **Suggesting Features**: Have an idea for a new feature? Open an issue to suggest it.
- **Code Contributions**: Want to fix a bug or add a feature? Follow these steps:
  1. Fork the repository
  2. Create a new branch (`git checkout -b feature/your-feature-name`)
  3. Make your changes
  4. Run the build process (`npm run build`)
  5. Commit your changes (`git commit -m 'Add some feature'`)
  6. Push to the branch (`git push origin feature/your-feature-name`)
  7. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/drizzle-paginator.git

# Install dependencies
cd drizzle-paginator
npm install

# Build the package
npm run build
```

### Code Style

We follow TypeScript best practices. Please ensure your code:
- Has appropriate TypeScript types
- Includes JSDoc comments for public APIs
- Follows the existing code style

### Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the CHANGELOG.md to document your changes
3. The PR will be merged once it's reviewed and approved

### Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## Support

If you need help with the package, feel free to:
- Open an issue on GitHub
- Contact the maintainer via [GitHub](https://github.com/skmirajbn) 