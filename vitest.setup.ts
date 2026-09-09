/**
 * An in-process `BroadcastChannel`, which is how the tests get two boots of the app to talk to each
 * other the way two tabs would.
 *
 * jsdom does not implement one, so the global is Node's. That one builds its own `MessageEvent` and
 * dispatches it through Node's `EventTarget`, which checks the instance against whatever `Event` is
 * global - and under jsdom that is jsdom's, so every message thrown an uncaught `TypeError` before
 * it arrived. Everything here is in one process anyway, so delivering the messages directly is both
 * simpler and a closer model of what the app sees in a browser.
 */

const channels = new Map<string, Set<TestBroadcastChannel>>();

class TestBroadcastChannel {
    readonly name: string;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onmessageerror: ((event: { data: unknown }) => void) | null = null;
    private closed = false;

    constructor(name: string) {
        this.name = name;

        const existing = channels.get(name) ?? new Set<TestBroadcastChannel>();
        existing.add(this);
        channels.set(name, existing);
    }

    postMessage(message: unknown) {
        if (this.closed) throw new Error("Cannot post to a closed BroadcastChannel");

        // Structured-cloned once, so that no listener can reach the sender's own objects, and
        // delivered in a later task, the way a browser does it
        const data = structuredClone(message);

        for (const channel of channels.get(this.name) ?? []) {
            if (channel === this || channel.closed) continue;
            setTimeout(() => !channel.closed && channel.onmessage?.({ data }), 0);
        }
    }

    close() {
        this.closed = true;
        channels.get(this.name)?.delete(this);
    }

    addEventListener() {
        throw new Error("This BroadcastChannel only supports `onmessage`");
    }
}

globalThis.BroadcastChannel = TestBroadcastChannel as unknown as typeof BroadcastChannel;

export {};
