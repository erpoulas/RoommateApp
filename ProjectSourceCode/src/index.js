// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.
const fs = require('fs');

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// Handlebars.registerHelper('hint_onClick', function(param1) {
//   return new Handlebars.SafeString(`onclick="hint('${param1}')"`);});

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});
/*
hbs.handlebars.keyboardTyping('range', (start, end) => {

});
*/

// database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST, // the database server
  port: process.env.POSTGRES_PORT, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
console.log(__dirname);
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.
//app.set('resources',path.join(__dirname,'resources'));
app.use(express.static(__dirname+'/resources'));
// path join is taking you to rpository 

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);


app.get('/', (req, res) => {
  res.status(200).render('pages/welcome', { pageClass: 'welcome-page' });
});

app.get('/welcome', (req, res) => {
  res.status(200).render('pages/welcome', { pageClass: 'welcome-page' });
});

app.get('/register', (req, res) => {
  res.status(200).render('pages/register', { pageClass: 'blank-page' });
});

app.get('/login', (req, res) => {
    res.status(200).render('pages/login', { pageClass: 'blank-page' });
});


// login creates a user session if the user passes in the correct
// / valid credentials. If invalid or wrong credentials were passed in
// the login page is rendered again. Otherwise on sucessful login
// the home page is rendered

app.post('/login', async (req, res) => {
  db.tx(async t => {
    const user = await t.one(
      `SELECT username, password
         FROM
          users
         WHERE
          username = $1`,
      [req.body.username]
    );
    //console.info(user)
    if(user.username === ''){

      res.render('pages/register', {pageClass: 'blank-page'});
      return;
    }
    console.log('matching')
    const match = await bcrypt.compare(req.body.password, user.password);
    console.log(match)
    if(match !== true){
      //res.redirect('/login', {message: "Wrong Password or Username"})
      res.status(400).render('pages/login' , {message: "Wrong Password or Username", pageClass: 'blank-page' });
      return;
    }
    req.session.user = req.body.username;
    req.session.save();
    res.redirect('/home');
  })
    .catch(err => {
      res.status(500).render('pages/register',{message: "Something Went Wrong", pageClass: 'blank-page'});
      // irregular errors like overflows
    });

});

app.post('/register', async (req, res) => {
    //hash the password using bcrypt library
    
    // register creates a new user in the user database. It takes
    // the information that the user passes in (username, password)
    // and creates and inserts a new user into the user database

    var uname = req.body.username;
    console.log("USERNAME: ", uname);
    const regquery = `insert into users (username, password, high_score) values ($1, $2, 0);`;
    if ((uname !== '') && (req.body.password !== '')){
    const hash = await bcrypt.hash(req.body.password, 10);
    db.any(regquery,[uname, hash])
    // if query execution succeeds
    // query results can be obtained
    // as shown below
    .then(data => {
        res.status(200).render('pages/login',{message: "Successful registration!", pageClass: 'blank-page' });
    })
    // if query execution fails
    // send error message
    .catch(err => {
      res.status(400).render('pages/register',{message: "Username already taken, try again", pageClass: 'blank-page' });
    });
  }
  else{
    console.log('uh oh spaghettio');
    res.status(400).render('pages/register',{message: "Something Went Wrong", pageClass: 'blank-page' });
  }
});


const auth = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    next();
};
app.use(auth);

// test case written
app.get('/settings', (req, res) => {
  res.status(200).render('pages/settings');
});

//logout destroys the user session and logs the user out
app.get('/logout', (req,res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).render('pages/logout', { 
        message: 'Could not log out. Please try again later.',
        error: true
      });
    }
    res.status(200).render('pages/logout', { 
      message: 'You have successfully logged out.',
      error: false
    });
  });
});

app.get('/home', (req, res) => {
  // displays information for the home screen, displays the user's data
  // their username, scores, etc
  var userRanked = `select * from users where users.username = '${req.session.user}'`;
  db.any(userRanked)
  .then( (rows) => {
    res.status(200).render('pages/home', {
      username: req.session.user,
      high_score: rows[0].high_score,
    });
  })
  .catch(err => {
    console.log("Error data was not fetched")
    console.error(err.message);
    res.status(500).render('pages/leaderboard', {message: "Error fetching data"});
  });
});

app.post('/score', (req, res) => {
  // let difficulty = req.session.difficulty || 'Easy';
  console.log('waoo');
  var score = `select * from users where users.username = '${req.session.user}'`;
  db.any(score)
  .then((rows) => {
    console.log(difficulty);
    var newScore;
    var updateScore;
    newScore = rows[0].high_score + 1;
    updateScore = `update users set high_score = ${newScore} where users.username = '${req.session.user}'`;
    console.log(newScore);
    db.any(updateScore)
    .then((rows) => {
      console.log(rows);
    })
    .catch((err) => {
      console.log(err);
    });
  })
  .catch((err) => {
    console.log(err);
  });

  
});


app.get('/leaderboard', function (req, res) {
  // loads the leaderboard by fetching all the users from the database
  // users are ranked by their highest hard mode score
  
    var usersRanked = `select * from users order by high_score desc;`
  
    // use task to execute multiple queries
    db.any(usersRanked)
      // if query execution succeeds
      // query results can be obtained
      // as shown below
      .then(data => {
        users = data;
        console.log("user data fetched");
        console.log(data);
        res.status(200).render('pages/leaderboard', {users})
      })
      // if query execution fails
      // send error message
      .catch(err => {
        console.log("Error users were not fetched")
        console.error(err.message);
        res.status(500).render('pages/leaderboard', {message: "Error fetching user data"});
      });
  }
  
  );

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
