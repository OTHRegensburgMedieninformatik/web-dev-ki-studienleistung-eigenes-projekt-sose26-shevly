'use strict';


const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');

const db = require('./db');

const app = express();


app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')));

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT groups.id, groups.name, groups.created_at, users.email
       FROM groups
       JOIN users ON groups.owner_id = users.id
       ORDER BY groups.created_at DESC`
    );
    res.render('index', { title: 'Willkommen', groups: result.rows });
  } catch (err) {
    console.error('Fehler beim Laden der Gruppen:', err.message);
    res.render('index', { title: 'Willkommen', groups: [] });
  }
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
        title: 'Registrieren',
        error: 'Diese E-Mail ist bereits registriert.'
      });
    }

  
    // Passwort noch mit bcrypt hashen.
                            
    await db.query(
      'INSERT INTO users (email, password) VALUES ($1, $2)',
      [email, password]
    );

    res.redirect('/users');

  } catch (err) {
    console.error('Fehler beim Registrieren:', err.message);
    res.render('signup', {
      title: 'Registrieren',
      error: 'Beim Speichern ist ein Fehler aufgetreten.'
    });
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Tricount-App laeuft auf http://localhost:' + port);
});
