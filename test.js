var events = require("events");
 var EventEmitter = events.EventEmitter;
var streamHelpers = require("./streams");
 var EventSponge = streamHelpers.EventSponge;
 var SlicingStream = streamHelpers.SlicingStream;

var temp = new EventSponge();
new SlicingStream(temp, 4).on("data", console.log.bind(console));
temp.resume().emit("data", "a test");//should log "st"