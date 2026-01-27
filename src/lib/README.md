# Library Utilities

This directory contains shared utilities, helpers, and configuration.

## Structure

```
lib/
├── db/             # Database utilities (Prisma client, helpers)
├── auth/           # Authentication utilities (NextAuth config, helpers)
├── validations/    # Zod validation schemas
└── utils.ts        # General utility functions (cn, formatters, etc.)
```

## Guidelines

- Keep utilities pure and testable
- Export typed functions with clear signatures
- Document complex utilities with JSDoc comments
- Group related utilities in subdirectories

## Common Utilities

- `cn()`: Class name merger (clsx + tailwind-merge)
- Date formatters
- Number formatters
- Type guards
- Validation helpers
