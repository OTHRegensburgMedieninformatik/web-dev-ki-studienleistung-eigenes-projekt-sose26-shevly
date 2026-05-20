'use strict';


const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');

const db = require('./db');

const app = express();
const bcrypt = require('bcrypt');

const session = require('express-session');
app.use(session({
  secret: 'irgendwas',
  resave: false,
  saveUninitialized: false
}));


app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')));

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main'
}));

app.set('view engine', 'hbs');



app.get('/', (req, res) => {
  res.render('index', { title: 'Willkommen' });
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Registrieren' });
});


app.post('/signup', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

 
  if (!email || !password) {
    return res.render('signup', {
      title: 'Registrieren',
      error: 'Bitte E-Mail und Passwort ausfuellen.'
    });
  }

  try {

    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.render('signup', {
        title: 'Login',
        error: 'Diese E-Mail ist bereits registriert.'
      });
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);
                            
    await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2)',
      [email, hashedPassword]
    );

    res.redirect('/dashboard');

  } catch (err) {
    console.error('Fehler beim Registrieren:', err.message);
    res.render('signup', {
      title: 'Registrieren',
      error: 'Beim Speichern ist ein Fehler aufgetreten.'
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login', {title: 'Login'});
})

app.post('/login', async(req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const result = await db.query( 'SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0){
      return res.render ('login', {
        title: 'Login',
        error: 'E-Mail Adresse existiert nicht. Bitte registrieren Sie sich'
      });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if(!match){
      return res.render ('login', {
        title: 'Login',
        error: 'E- Mail oder Passwort falsch'
      });
    }

    req.session.userId = user.id;
    res.redirect('/dashboard');

    res.redirect('/dashboard');

  } catch (err){
    console.error('Fehler beim Login:', err.message);
    res.render('login', {
      title: 'Login',
      error: 'Beim Login ist ein Fehler aufgetreten'
    });
  }
});

app.get('/dashboard', async(req, res)=>{
  try{
    const result = await db.query(
        'SELECT groups.name, groups.created_at FROM groups WHERE owner_id = $1', [req.session.userId]
    );
    res.render('dashboard',{
      title: 'Startseite',
      groups: result.rows
    });
  } catch (err) {
    console.error('Fehler beim Laden', err.message);
    res.render('dashboard', {
      title: 'Startseite',
      groups: []
    });
  }
});

app.post('/groups/create', async (req, res) => {
  const name = req.body.name;

  try {
    await db.query(
        'INSERT INTO groups (name, owner_id) VALUES ($1, $2)',
        [name, req.session.userId]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Fehler beim Erstellen:', err.message);
    res.redirect('/dashboard');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('finance laeuft auf http://localhost:' + port);
});