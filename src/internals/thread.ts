
/**
 * そのうち独自クラスの処理にする。
 * 現状Promiseのラッパー
 */
export class Thread implements Promise<any> {
    [Symbol.toStringTag]: string = "Thread";

    constructor(
        public executor: (
            resolve: (value: any) => void, 
            reject: (reason?: any) => void
        ) => void
    ) {}

    then<TResult1 = any, TResult2 = never>(
        onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null, 
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return new Promise(this.executor).then(onfulfilled, onrejected);
    }

    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): Promise<any | TResult> {
        return new Promise(this.executor).catch(onrejected);
    }

    finally(onfinally?: (() => void) | undefined | null): Promise<any> {
        return new Promise(this.executor).finally(onfinally);
    }

    static resolve(value: any): Thread {
        return new Thread((resolve) => resolve(value));
    }

    static reject(reason?: any): Thread {
        return new Thread((_, reject) => reject(reason));
    }
}