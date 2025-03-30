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
  helpers: {
      eq: (a, b) => a === b // Custom helper to check if values are equal
  }
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


app.get('/group-selection', (req, res) => {
  res.status(200).render('pages/group-selection', { username: req.session.user, pageClass: 'blank-page' });
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
      res.status(400).render('pages/login' , {message: "Wrong Password or Username", pageClass: 'blank-page' });
      return;
    }
    req.session.user = req.body.username;
    req.session.groupId = user.group_id;

    if (!user.group_id) {
      return res.redirect('/group-selection');
    }

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
    const regquery = `insert into users (username, password, high_score, group_id ) values ($1, $2, 0, NULL);`;
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

app.post('/create-group', async (req, res) => {
  const { groupName } = req.body;
  const groupCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit code

  // Insert new group
  const group = await db.one(`INSERT INTO groups (group_name, group_code) VALUES ($1, $2) RETURNING id`, 
                             [groupName, groupCode]);

  // Update user to join this group
  await db.none(`UPDATE users SET group_id = $1 WHERE username = $2`, [group.id, req.session.user]);

  req.session.groupId = group.id; // Store group in session
  res.redirect('/home'); // Redirect to home after group creation
});

app.post('/join-group', async (req, res) => {
  const { groupCode } = req.body;

  // Find group by code
  const group = await db.oneOrNone(`SELECT id FROM groups WHERE group_code = $1`, [groupCode]);

  if (!group) {
      return res.status(400).render('pages/group-selection', { message: "Invalid group code" });
  }

  // Update user to join this group
  await db.none(`UPDATE users SET group_id = $1 WHERE username = $2`, [group.id, req.session.user]);

  req.session.groupId = group.id; // Store group in session
  res.redirect('/home'); // Redirect to home after joining
});

// const ensureInGroup = (req, res, next) => {
//   if (!req.session.groupId) {
//       return res.redirect('/group-selection'); // Force users to pick a group
//   }
//   next();
// };


const auth = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    next();
};
app.use(auth);


app.post('/add-task', async (req, res) => {
  try {
      const { taskName, frequency } = req.body;
      const groupId = req.session.groupId;

      if (!taskName || !frequency || !groupId) {
          return res.status(400).send("Invalid task data.");
      }

      await db.none(
          `INSERT INTO tasks (task_name, group_id, assigned_user, completed, frequency) 
           VALUES ($1, $2, NULL, FALSE, $3)`,
          [taskName, groupId, frequency]
      );

      res.status(200).send("Task added.");
  } catch (err) {
      console.error("❌ ERROR in /add-task:", err);
      res.status(500).send("Server error while adding task.");
  }
});


// app.post('/add-task', async (req, res) => {
//   const { taskName } = req.body;
//   const groupId = req.session.groupId;

//   if (!taskName || !frequency || !groupId) {
//     return res.status(400).send("Invalid task data.");
// }

//   await db.none(
//       `INSERT INTO tasks (task_name, group_id, assigned_user, completed, frequency) 
//        VALUES ($1, $2, NULL, FALSE, 'daily')`,
//       [taskName, groupId]
//   );

//   res.status(200).send("Task added.");
// });


// app.post('/add-task', async (req, res) => {
//   const { taskName } = req.body;
//   const groupId = req.session.groupId; // Get user's group

//   if (!groupId) {
//       return res.redirect('/group-selection'); // User must be in a group
//   }

//   // Insert task with no assigned user
//   await db.none(`INSERT INTO tasks (group_id, task_name, assigned_user) VALUES ($1, $2, NULL)`, 
//                [groupId, taskName]);

//   res.redirect('/tasks'); // Redirect back to tasks list
// });

app.post('/random-assign-tasks', async (req, res) => {
  const groupId = req.session.groupId;

  // Get all unassigned tasks
  const tasks = await db.any(`SELECT id FROM tasks WHERE group_id = $1 AND assigned_user IS NULL`, [groupId]);

  // Get all group members
  const members = await db.any(`SELECT username FROM users WHERE group_id = $1`, [groupId]);

  if (tasks.length === 0 || members.length === 0) {
      return res.status(400).send("No unassigned tasks or no group members.");
  }

  // Assign tasks randomly
  for (const task of tasks) {
      const randomMember = members[Math.floor(Math.random() * members.length)].username;
      await db.none(`UPDATE tasks SET assigned_user = $1 WHERE id = $2`, [randomMember, task.id]);
  }

  res.redirect('/tasks');
});

app.post('/complete-task/:taskId', async (req, res) => {
  try {
      const taskId = req.params.taskId;

      // ✅ Fetch the task to get the assigned user
      const task = await db.oneOrNone(`SELECT assigned_user FROM tasks WHERE id = $1`, [taskId]);

      if (!task) {
          return res.status(404).send("Task not found.");
      }

      if (!task.assigned_user) {
          return res.status(400).send("Task is unassigned and cannot be completed.");
      }

      // ✅ Update the task as completed
      await db.none(`UPDATE tasks SET completed = TRUE WHERE id = $1`, [taskId]);

      // ✅ Increase the assigned user's high_score by 1
      await db.none(`UPDATE users SET high_score = high_score + 100 WHERE username = $1`, [task.assigned_user]);

      console.log(`✅ Task ${taskId} completed by ${task.assigned_user}. Score updated.`);
      res.status(200).send(`Task ${taskId} completed by ${task.assigned_user}. Score increased.`);
  } catch (err) {
      console.error("❌ ERROR in /complete-task:", err);
      res.status(500).send("Server error while completing task.");
  }
});


// app.post('/complete-task/:taskId', async (req, res) => {
//   try {
//       const taskId = req.params.taskId;

//       // ✅ Ensure the task exists before updating
//       const task = await db.oneOrNone(`SELECT * FROM tasks WHERE id = $1`, [taskId]);

//       if (!task) {
//           return res.status(404).send("Task not found.");
//       }

//       // ✅ Mark the task as complete
//       await db.none(`UPDATE tasks SET completed = TRUE WHERE id = $1`, [taskId]);

//       console.log(`✅ Task ${taskId} marked as complete.`);
//       res.status(200).send(`Task ${taskId} completed.`);
//   } catch (err) {
//       console.error("❌ ERROR in /complete-task:", err);
//       res.status(500).send("Server error while completing task.");
//   }
// });



app.get('/tasks', async (req, res) => {
  const groupId = req.session.groupId;
  const username = req.session.user;

  if (!groupId) {
      return res.redirect('/group-selection');
  }

  // Get all incomplete tasks for the group
  const tasks = await db.any(`
      SELECT * FROM tasks 
      WHERE group_id = $1 
      AND completed = FALSE`, 
      [groupId]
  );

  res.render('pages/tasks', {
    tasks: tasks,
    username: username,
    pageClass: 'homepage'
  });
});




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
      pageClass: 'homepage'
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
  console.log("Session Data:", req.session);
  // Ensure user is authenticated and has a group_id
  if (!req.session.username || !req.session.group_id) {
    return res.status(403).render('pages/leaderboard', {
      message: 'You must be logged in to view the leaderboard.',
      pageClass: 'homepage'
    });
  }

  const groupId = req.session.group_id; // Retrieve user's group ID from session

  // Query: Get users from the same group, ordered by high_score
  const usersRanked = `
    SELECT * FROM users
    WHERE group_id = $1
    ORDER BY high_score DESC;
  `;

  // Execute query
  db.any(usersRanked, [groupId])
    .then(data => {
      console.log("User data fetched:", data);
      res.status(200).render('pages/leaderboard', {
        users: data,
        pageClass: 'homepage'
      });
    })
    .catch(err => {
      console.error("Error: users were not fetched", err.message);
      res.status(500).render('pages/leaderboard', {
        message: 'Error fetching user data',
        pageClass: 'homepage'
      });
    });
});

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
