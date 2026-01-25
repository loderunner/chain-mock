/**
 * Fake SQL query builder for testing chain-mock type inference.
 *
 * Supports:
 * - SELECT column [, column]
 * - FROM table
 * - [WHERE expr]
 * - [GROUP BY expr]
 * - [ORDER BY expr]
 * - [LIMIT n]
 *
 * @example
 * ```ts
 * const rows = await select('id', 'name')
 *   .from('users')
 *   .where('id = 42')
 *   .limit(1);
 * ```
 */

/**
 * A row returned from a query.
 */
export type Row = Record<string, unknown>;

/**
 * Builder returned after FROM clause is specified.
 * Supports WHERE, GROUP BY, ORDER BY, LIMIT, and is awaitable.
 */
export type FromBuilder = {
  /**
   * Adds a WHERE clause.
   *
   * @param expr - SQL expression for filtering
   * @returns The builder for chaining
   *
   * @example
   * ```ts
   * select('id').from('users').where('active = true')
   * ```
   */
  where(expr: string): FromBuilder;

  /**
   * Adds a GROUP BY clause.
   *
   * @param expr - Column or expression to group by
   * @returns The builder for chaining
   *
   * @example
   * ```ts
   * select('status', 'COUNT(*)').from('orders').groupBy('status')
   * ```
   */
  groupBy(expr: string): FromBuilder;

  /**
   * Adds an ORDER BY clause.
   *
   * @param expr - Column or expression to order by
   * @returns The builder for chaining
   *
   * @example
   * ```ts
   * select('name').from('users').orderBy('name ASC')
   * ```
   */
  orderBy(expr: string): FromBuilder;

  /**
   * Adds a LIMIT clause.
   *
   * @param n - Maximum number of rows to return
   * @returns The builder for chaining
   *
   * @example
   * ```ts
   * select('id').from('users').limit(10)
   * ```
   */
  limit(n: number): FromBuilder;
} & PromiseLike<Row[]>;

/**
 * Builder returned after SELECT columns are specified.
 * Only FROM is available at this stage.
 */
export type SelectBuilder = {
  /**
   * Specifies the table to select from.
   *
   * @param table - Table name
   * @returns FromBuilder for adding WHERE, ORDER BY, etc.
   *
   * @example
   * ```ts
   * select('id', 'name').from('users')
   * ```
   */
  from(table: string): FromBuilder;
};

/**
 * Starts a SELECT query with the specified columns.
 *
 * @param columns - Column names to select
 * @returns SelectBuilder for specifying FROM clause
 *
 * @example
 * ```ts
 * const users = await select('id', 'name')
 *   .from('users')
 *   .where('active = true')
 *   .orderBy('name')
 *   .limit(100);
 * ```
 */
export declare function select(...columns: string[]): SelectBuilder;
