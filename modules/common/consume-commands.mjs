/** Finish a synchronous domain iterator at the application boundary.
 * Each command names a supplied effect. Its result resumes the iterator before the next mutation.
 * Errors propagate to the caller; this helper does not queue, retry or own state. */
export function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
}
