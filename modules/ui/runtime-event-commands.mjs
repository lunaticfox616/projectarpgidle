import { consumeDomainCommands } from '../common/consume-commands.mjs';

/** Consume domain event generators synchronously, at each yielded state boundary.
 * Only dispatchRuntimeEvent commands belong here. The returned domain value is preserved.
 * The dispatcher is supplied by the application; this module never owns game state. */
export function runRuntimeEventCommands(commands, dispatch) {
    return consumeDomainCommands(commands, { dispatchRuntimeEvent: dispatch });
}
