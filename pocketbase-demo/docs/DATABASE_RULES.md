# Database Rules & Validation

This document explains the data validation rules enforced at different layers of the application.

## Overview

The application enforces data integrity through two layers:

1. **Client-Side Validation** (in `public/schemas/` and `services/data.service.js`)
   - Fast feedback to users
   - Reduces unnecessary server requests
   - Provides detailed error messages
   - Can be bypassed by malicious users

2. **Server-Side Validation** (PocketBase database rules in `setup.mjs`)
   - Final authority on data integrity
   - Cannot be bypassed
   - Enforces security and business logic

## Collections

### Posts Collection

#### Schema (from setup.mjs lines 195-256)
```javascript
{
  title: string (required, 3-140 chars)
  slug: string (required, pattern: ^[a-z0-9-]+$)
  content: editor/HTML (required)
  aiGenerated: boolean (optional)
  status: enum ['draft', 'published', 'archived'] (required)
  categories: relation to categories (optional, max 3)
  author: relation to users (required)
  featured: boolean (optional)
}
```

#### Server-Side Rules
- **List**: Public (any user can list)
- **View**: Public (any user can view)
- **Create**: Authenticated users only (`@request.auth.id != ""`)
- **Update**: Authenticated users only
- **Delete**: Authenticated users only

#### Client-Side Validation (post.schema.js)
- Title: 3-140 characters
- Slug: lowercase alphanumeric with hyphens only
- Content: minimum 1 character
- Status: must be 'draft', 'published', or 'archived'
- Categories: maximum 3 items
- Author: required string (user ID)

### Users Collection

#### Schema (from setup.mjs lines 117-153)
```javascript
{
  email: string (required, unique)
  password: string (required, min 8 chars)
  displayName: string (optional, max 120 chars)
  bio: string (optional, max 500 chars)
}
```

#### Server-Side Rules
- **List**: Public (any user can list)
- **View**: Public (any user can view)
- **Create**: Public (anyone can register)
- **Update**: Owner only (`@request.auth.id = id`)
- **Delete**: Owner only

#### Client-Side Validation (user.schema.js)
- Email: valid email pattern
- Password: minimum 8 characters
- Password confirmation: must match password
- Display name: maximum 120 characters
- Bio: maximum 500 characters

### Categories Collection

#### Schema (from setup.mjs lines 155-190)
```javascript
{
  label: string (required, 3-80 chars)
  slug: string (required, pattern: ^[a-z0-9-]+$)
  description: string (optional, max 160 chars)
}
```

#### Server-Side Rules
- **List**: Public
- **View**: Public
- **Create**: Authenticated users only
- **Update**: Authenticated users only
- **Delete**: Authenticated users only

#### Client-Side Validation (category.schema.js)
- Label: 3-80 characters
- Slug: lowercase alphanumeric with hyphens only
- Description: maximum 160 characters

### Site Stats Collection

#### Schema (from setup.mjs lines 294-318)
```javascript
{
  visitor_count: number (required, min 0)
  last_visit: date (optional)
}
```

#### Server-Side Rules
- **List**: Public (read-only for display)
- **View**: Public
- **Create**: Public (for initial setup)
- **Update**: Public (anyone can increment counter)
- **Delete**: Authenticated users only

#### Client-Side Validation (stats.schema.js)
- Visitor count: must be a number >= 0
- Last visit: ISO date string

## Data Service Layer

The `DataService` class in `services/data.service.js` provides a centralized API for all database operations. All methods include:

1. **Input validation** using schemas from `schemas/` directory
2. **Consistent error handling** with descriptive messages
3. **Type safety** through JSDoc comments
4. **Request deduplication** via PocketBase `requestKey` option

### Key Methods

#### Posts
- `getPosts(page, perPage, options)` - Paginated list with expand
- `getPost(id, options)` - Single post with expand
- `createPost(data)` - Validates then creates
- `updatePost(id, data)` - Validates then updates
- `deletePost(id)` - Deletes post

#### Users
- `createUser(data)` - Validates (including password match) then creates
- `authWithPassword(email, password)` - Validates then authenticates

#### Categories
- `getCategories()` - Gets all categories sorted by label

#### Stats
- `getStats()` - Gets the site stats record
- `updateHitCounter()` - Increments visitor count atomically

#### Realtime
- `subscribeToCollection(collection, recordId, callback)` - Subscribe to changes
- `unsubscribeAll()` - Clean up subscriptions
- `disconnect()` - Disconnect realtime connection

## Validation Error Handling

### Client-Side Errors
```javascript
// Example validation error from dataService
throw new Error('Validation failed: title must be at least 3 characters, status must be one of: draft, published, archived');
```

### Server-Side Errors
```javascript
// Example PocketBase error
{
  status: 400,
  message: "Failed to create record.",
  data: {
    title: { code: "validation_required", message: "Missing required value" }
  }
}
```

The data service catches both types and formats them consistently:
```javascript
appendLog(`❌ Failed to create post: Validation failed: title must be at least 3 characters`);
```

## Best Practices

### When Adding New Fields

1. **Update PocketBase schema** in `setup.mjs`
2. **Update client schema** in `public/schemas/`
3. **Update DataService** if new operations needed
4. **Update this documentation**

### When Validating Data

- Always validate on both client and server
- Client validation for UX (fast feedback)
- Server validation for security (cannot be bypassed)
- Use consistent error messages across both layers

### Testing Validation

To test validation works:
```javascript
// Should fail - title too short
await dataService.createPost({
  title: 'Hi',  // Only 2 chars, needs 3+
  content: 'Test',
  status: 'published',
  author: 'user_id',
  slug: 'test'
});
// Error: "Validation failed: title must be at least 3 characters"

// Should fail - invalid status
await dataService.createPost({
  title: 'Valid Title',
  content: 'Test',
  status: 'invalid',  // Not in enum
  author: 'user_id',
  slug: 'test'
});
// Error: "Validation failed: status must be one of: draft, published, archived"
```

## Security Notes

- Client-side validation can always be bypassed
- Server-side rules are the final authority
- Auth rules protect user data (`@request.auth.id = id`)
- Public collections allow anonymous reads
- Authenticated operations require valid JWT token

## References

- PocketBase schema: `setup.mjs` lines 114-327
- Client schemas: `public/schemas/*.schema.js`
- Data service: `public/services/data.service.js`
- Validator utility: `public/utils/validator.js`

