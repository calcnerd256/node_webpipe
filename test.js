var events = require("events");
 var EventEmitter = events.EventEmitter;
var streamHelpers = require("./streams");
 var EventSponge = streamHelpers.EventSponge;
 var SlicingStream = streamHelpers.SlicingStream;
var needle = require("needle");

var temp = new EventSponge();
new SlicingStream(temp, 4).on("data", console.log.bind(console));
temp.resume().emit("data", "a test");//should log "st"

needle.post(
    'http://calcnerd256.dyndns.org:15216/fortune/teeth',
    'str=digraph%7B%0D%0A+a-%3%0D%0A%7D%FFecho lol',
    {
	user_agent: 'Mozilla/5.0 (Windows NT 6.1; rv:17.0) o/20100101 Firefox/17.0'
    },
    function(e,r,b) { console.log(b.toString()); }
);