import { readdir, stat } from "fs/promises";
import { join } from "path";

/**
 * Recursively reads a directory and returns all files in it.
 * Note that this function itself is not recursive to avoid stack overflows.
 *
 * @param path The path to the directory to read.
 * @returns A {@link Promise} that resolves to an array of all files in the directory.
 */
export async function recursiveReadDir(path: string): Promise<string[]> {
    const result: string[] = [];
    const stack: string[] = [path]; // Use a stack to simulate recursion

    while (stack.length > 0) {
        const currentPath = stack.pop()!;
        const entries = await readdir(currentPath);

        for (const entry of entries) {
            const entryPath = join(currentPath, entry);
            const entryStat = await stat(entryPath);

            if (entryStat.isDirectory()) {
                stack.push(entryPath); // Add subdirectory path to stack
            } else {
                result.push(entryPath); // Add file path to result array
            }
        }
    }

    return result;
}
