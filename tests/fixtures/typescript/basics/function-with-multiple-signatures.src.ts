
function foo(bar: string): string;
function foo(bar: number): number;
function foo(bar: string| number): string | number {
    return bar;
}
