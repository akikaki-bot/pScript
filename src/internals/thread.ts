type ThreadHandle = {
    join: (cb?: (err: any, res?: any) => void) => Promise<any>;
    cancel: () => void;
};


/**
 * Minimal cooperative async helper
 * - Thread.spawn(fn, callback?) 
 * => returns a handle { join(cb?), cancel() }
 * - Thread.sleep(ms) 
 * => Promise that resolves after ms (for advanced users)
 * - Thread.yield() 
 * => Promise resolved on next tick
 * 
 * @example
 * new Thread(fnOrValue).thread(...args)
 * // runs fn in thread, returns Promise
 * new Thread(value).await(cb)
 * // calls cb with value on next tick
 */
export class Thread {
    
    private _value?: Promise<any>;
    private fnc?: Function;

    constructor( threadValue ?: any ) {
        if (typeof threadValue === 'function') {
            this.fnc = threadValue;
        } else if (threadValue !== undefined) {
            this._value = Promise.resolve(threadValue);
        }
    }

    static spawn(fn: Function, cb?: (err: any, res?: any) => void): ThreadHandle {
        if (typeof fn !== 'function') throw new TypeError('Thread.spawn requires a function');
        let cancelled = false;

        const p = new Promise<any>((resolve, reject) => {
            Promise.resolve().then(() => {
                if (cancelled) return reject(new Error('Cancelled'));
                try {
                    const res = fn();
                    resolve(res);
                } catch (e) {
                    reject(e);
                }
            });
        });

        p.then((res) => {
            if (cb) cb(null, res);
        }).catch((err) => {
            if (cb) cb(err);
        });

        return {
            join(cb2?: (err: any, res?: any) => void) {
                if (cb2) {
                    p.then((r) => cb2(null, r))
                     .catch((e) => cb2(e));
                }
                return p;
            },
            cancel() {
                cancelled = true;
            }
        };
    }

    static sleep(ms: number) {
        return new Promise((res) => setTimeout(res, ms));
    }

    static yield() {
        return Promise.resolve();
    }

    thread(...args: any[]) {
        if (typeof this.fnc === 'function') return Thread.spawn(this.fnc).join();
        return this._value ? this._value : Promise.resolve(undefined);
    }

    await(cb: (err: any, res?: any) => void) {
        if (typeof this.fnc === 'function') {
            Thread.spawn(this.fnc).join(cb);
            return;
        }
        if (this._value) {
            this._value.then((r) => cb(null, r)).catch((e) => cb(e));
            return;
        }
        cb(null, undefined);
    }
}