function dec(target: any) {
}
function gec() {
    return (target: any, proeprtyKey: string) => {}
}

@dec
class C {
    @gec() field: string
    @gec() method(): string {
        return ""
    }
}
