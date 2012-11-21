//http library documented at http://nodejs.org/api/http.html
var http = require("http");
var port = 15216; //typically 80
// respond is a function that takes an HTTP request and an HTTP response
// when a request comes in, the http library fires an event
// at the end of this file, I'm going to do something that binds this function to that event
function fluentCall(object, key, parameters){
 //sometimes, we want to call a method on an object and then call another one
 // as in, someObject.someMethod(x, y, z); someObject.anothermethod(w);
 //sometimes, the object we want to use is the result of some expression
 //we can say var ob = someExpression; ob.someMethod(x,y,z); ob.anothermethod(w);
 //but it's nice to be able to say (someExpression).someMethod(x,y,z).anothermethod(w)
 // this is called "fluent" style (I don't know who coined that term)
 //some methods work like that, returning the object that called them
 //however, there's nothing that guarantees that any given method works like that
 //so here's a function that lets you act like a method does that, whether it does or not

 //methods in JS are just properties
 //I can have an object x that has a property like x.color
 //but if I have a method x.toString() , that's really just a function-valued property
 //we can even patch methods into existing objects by storing functions in their properties
 //properties can be accessed with a . or with []
 //if you write x.y , it means the same thing as x["y"]
 //[] lookup takes a string
 //it's like reifying the name of the property
 var method = object[key];
 //so if key == "someMethod"
 // then object["someMethod"] is the same thing as object.someMethod
 //you can even use property names that would cause syntax errors if you tried to use . lookup on them!
 // any string works

 //every function has an apply method
 //there's a special variable in JS called this
 //when you call someObject.someMethod(someArg, anotherArg, etc)
 // any reference to the "this" variable in that method body equals someObject
 //sometimes you want to act like you called a method with a different this
 //apply takes the this as its first parameter
 //its second parameter is a list of the arguments you want to pass to the method
 //JS doesn't care how many arguments you pass to functions
 method.apply(object, parameters);

 //now, to make the helper act like a fluent call
 return object;
}
function respond(request, response){
 var q = request;
 var s = response;
  if("GET" == q.method)
   return fluentCall(
    response,
    "writeHead",
    [
     200,
     {"Content-type": "text/html"}
    ]
   ).end(
    [
     "<form method=\"POST\">",
     "<textarea name=\"str\">",
     "digraph{",
      "a->b;",
     "}",
     "</textarea>",
     "<input type=\"submit\"></input>",
     "</form>"
     ].join("\n")
   );
  s.writeHead(200, {"Content-type": "image/svg+xml"});
  (
   function(p){
    var dat = [];
    q.on("data", function(chunk){dat.push(chunk);});//buffering is bad
    q.on(
     "end",
     function(){
      var a = dat.join("").split(";").map(
       function(str){
	return str.split("=").map(decodeURIComponent);
       }
      );
      var d = a.reduce(function(p, c){p[c[0]] = c[1]; return p;}, {});
      var str = d.str;
      p.stdin.write(str+"");
      p.stdin.end();
     }
    );
    p.stdout.on("data", function(chunk){s.write(chunk);});
    p.stdout.on("end", function(){s.end();});
   }
  )(require("child_process").spawn("dot", ["-Tsvg"]));
}

//the createServer function of the http library is a helper
// it takes a function and returns an HTTP server
// that callback function gets bound to the request event
var server = http.createServer(respond);
//now that I have a server, it needs to start listening for incoming connections
server.listen(
 port,
 function(){
  //this function gets called when the server is ready to take requests
  //everything in NodeJS is asynchronous
  // so you have to pass continuations explicitly
  //uncomment the following line if you want to see when it starts
  //console.log("server listening on port " + port);
  // the console object prints to standard output by default
 }
);
//now that you have an HTTP server listening on a port, the program won't end
//if you need to end the program, you can press Ctrl+C at the command line