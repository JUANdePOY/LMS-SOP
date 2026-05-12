var fs = require("fs");
var p = "D:/Programs/wamp64/www/PAFR/client/src/App.jsx";
var c = fs.readFileSync(p, "utf8");

// Remove the Airbase pages lazy imports block
c = c.replace(// \u2014\u2014\u2014\u2014\u2014 Airbase pages[\s\S]*?const ManageSquadrons.*?;\n\n/, "");

// Remove Airbase routes from router block
c = c.replace(/      \/\/ \u2014\u2014\u2014\u2014\u2014 Airbase nested routes[\s\S]*?ProtectedWrapper\(ManageSquadrons\)[\s\S]*?},/, "");

// Clean up extra blank lines
c = c.replace(/\n{3,}/g, "\n\n");

fs.writeFileSync(p, c);
console.log("Done");

