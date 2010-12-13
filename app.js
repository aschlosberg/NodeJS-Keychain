var	express = require('express'),
		app = express.createServer(
			//express.cache(),
			express.staticProvider(__dirname + '/static'),
			express.bodyDecoder()
		),
		mongoose = require('mongoose').Mongoose,
		db = mongoose.connect('mongodb://localhost/password')
		fn = require('./functions.js'),
		hash = fn.hash;

var models = ['user', 'pass'];
var modelJs = [];

for(var m in models){
	modelJs[m] = require('./models/'+models[m]+'.js').model;
	var name = models[m].ucFirst();
	mongoose.model(name,  modelJs[m]);
	db[name] = db.model(name);
}

app.get('/', function(req, res){
	if(!defined(req.param('user')) || !defined(req.param('pass')) || !defined(req.param('domain'))){
		login(req, res);
	}
	else {
		getPass(req, res);
	}
});

function defined(val){
	return typeof val != 'undefined';
}

function login(req, res, msg){
	if(!msg){
		msg = '';
	}
	res.send({action: 'login', msg: msg});
}

function getPass(req, res){
	var user = req.param('user');
	var pass = req.param('pass');
	var domain = req.param('domain');
	
	db.User.get(db, user, function(u){
		try {
			if(!u.checkPassword(pass)) throw 0;
			
			db.Pass.get(db, user, domain, function(p){
				try {
					sendPass(req, res, p.getPass(pass));
				}
				catch(e){
					try {
						var p = new db.Pass();
						p.user = user;
						p.domain = domain;
						
						var domain_pass = hash(new Date() + Math.random().toString() + user + pass + domain);
						
						p.pass = [pass, domain_pass];
						
						p.save(function(){
							sendPass(req, res, domain_pass);
						});
					}
					catch(e){
						login(req, res, 'Error while creating new password: '+e);
					}
				}
			});
		}
		catch(e){
			login(req, res, 'Incorrect username / password');
		}
	});
}

function sendPass(req, res, pass){
	res.send({action: 'pass', pass: pass});
}

app.listen(80);
console.log('Express server started on port %s', app.address().port);