/** DSH 0.1.7 resolves refused writes to false; older settings scopes resolve to void. */
export async function writeSetting(scope, field, value, rejectedMessage) {
    if (await scope.set(field, value) === false)
        throw new Error(rejectedMessage);
}
//# sourceMappingURL=settings-write.js.map