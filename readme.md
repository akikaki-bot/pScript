# PScript
tiny, javaScript like Programming Language

```
let hello = "hello"; # comments out
let world = "world";
print( hello, world, "!");

# comments out are began with hash

# function declaration
function fib(n) {
    if(n == 0) return 0;
    if(n == 1) return 1;
    else return fib(n - 1) + fib(n - 2);
}
fib(10);
```
