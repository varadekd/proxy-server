
const express = require("express");
const request = require("request");
const app = express();
const port = 7812;

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept"
	);
	next();
});

app.use("/solr", (req, res) => {
	console.log("req" , req.url)
	const url = "http://localhost:8983/solr" + req.url;
	req.pipe(request({ url })).pipe(res);
});

app.listen(port, () => {
	console.log(`Proxy server listening at http://localhost:${port}`);
});
