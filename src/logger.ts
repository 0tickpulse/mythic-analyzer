const STDOUT_LOGGER: Logger = {
    /* eslint-disable no-console -- console is fine here */
    supportsColor: true,
    // @ts-expect-error -- TS is being weird about the return type of this function
    debug: (...args: unknown[]) => {
        console.debug(...args);
        if (args.length === 1) {
            return args[0];
        }
    },
    log: console.log,
    warn: console.warn,
    error: console.error,
    /* eslint-enable no-console */
};

/**
 * A logger you can implement to log messages from a workspace.
 */
interface Logger {
    /**
     * Whether the logger supports color through ANSI escape codes.
     * Defaults to `true`.
     */
    supportsColor?: boolean;
    debug: (<T>(arg: T) => T) & ((arg1: unknown, arg2: unknown, ...args: unknown[]) => void);
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

export { STDOUT_LOGGER };
export type { Logger };
