# PScript
tiny, Python and JavaScript like Programming Language

ちいさくて、PythonとJavaScriptみたいなプログラミング言語。

```
let hello = "hello"; # comments out
let world = "world";
print( hello, world, "!");

# comments out are began with hash

# function declaration
fn fib(n) {
    if(n == 0) return 0;
    if(n == 1) return 1;
    else return fib(n - 1) + fib(n - 2);
}
fib(10);

# Array declaration
let array = [ 0, "hi there", 2 ]
print( array[1] );
if( arr[0] == 0 ){
    print('arr[0] is zero');
}
array[0] = 1;
print(array[0], " plus ", array[2], " is ", array[0] + array[2] );

# while statements ( ex: fizzbuzz )
let i = 0;
while( i < 100 ){
    i = i + 1;
    if( i % 15 == 0 ) print('fizz buzz')
    else if( i % 5 == 0 ) print('fizz')
    else if( i % 5 == 0 ) print('buzz')
    else print(i)
}
```

## Example: Calculate prime 1 to 1000
```
fn isPrime( n ){
    if( n == 1 ) return false;
    let i = 2;
    while( i < n ){
        if( n % i == 0 ) return false
        i = i + 1
    }
    return true
}

let j = 0;
while( j < 1000 ){
    j = j + 1 
    let prime = isPrime( j );
    if( prime ) print(j)
}
```

## If statements keywords
```
if( a != b ) {}
if( a isnt b ){}

if( a == b ){}
if( a and b ){}

if( a || b ){}
if( a or b ){}
```
