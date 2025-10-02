type Brand<T, B extends string> = T & { __brand: B };

export type SnakeCase = Brand<string, "SnakeCase">;
export type SingleLine = Brand<string, "SigleLine">;

export function snakeCase(input: string): SnakeCase {
    if (/^[a-z]+(_[a-z0-9]+)*$/.test(input)){
        return input as SnakeCase
    }
    else {
        throw new Error("The input contains an invalid snakecase character")
    }
}

export function singleLine(input: string): SingleLine {
    if (input.includes("\r\n") || input.includes("\n")){
        throw new Error("The input contains a line ending")
    }
    else {
        return input as SingleLine
    }
}