/**
 * Returns true if the value is of type `Iterable<T>`.
 *
 * @param value The value to check.
 * @returns True if the value is of type `Iterable<T>`.
 */
export function isIterable<T>(value: unknown): value is Iterable<T> {
    return typeof value === "object" && value !== null && Symbol.iterator in value;
}
