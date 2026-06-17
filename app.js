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

app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.userId;
  next()
});

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
  const username = req.body.username;
  const password = req.body.password;

  if (!email || !username || !password) {
    return res.render('signup', {
      title: 'Registrieren',
      error: 'Bitte alle Felder ausfüllen.'
    });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.render('signup', {
        title: 'Registrieren',
        error: 'E-Mail oder Benutzername ist bereits vergeben.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (email, username, password) VALUES ($1, $2, $3)',
      [email, username, hashedPassword]
    );

    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);

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
  const identifier = req.body.identifier;
  const password = req.body.password;

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [identifier]
    );

    if (result.rows.length === 0){
      return res.render('login', {
        title: 'Login',
        error: 'Benutzername oder E-Mail nicht gefunden.'
      });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if(!match){
      return res.render('login', {
        title: 'Login',
        error: 'Passwort falsch.'
      });
    }

    req.session.userId = user.id;
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);

  } catch (err){
    console.error('Fehler beim Login:', err.message);
    res.render('login', {
      title: 'Login',
      error: 'Beim Login ist ein Fehler aufgetreten.'
    });
  }
});

app.get('/dashboard', async(req, res)=>{
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try{
    const result = await db.query(
      'SELECT groups.id, groups.name, TO_CHAR(groups.created_at, \'DD.MM.YYYY\') AS created_at, users.username AS owner_name FROM groups JOIN group_members ON groups.id = group_members.group_id JOIN users ON groups.owner_id = users.id WHERE group_members.user_id = $1',
      [req.session.userId]
    );
    const userResult = await db.query(
      'SELECT username FROM users WHERE id = $1',
      [req.session.userId]
    );
    res.render('dashboard',{
      title: 'Startseite',
      groups: result.rows,
      userName: userResult.rows[0].username
    });
  } catch (err) {
    console.error('Fehler beim Laden', err.message);
    res.render('dashboard', {
      title: 'Startseite',
      groups: []
    });
  }
});

app.get('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const result = await db.query(
      'SELECT email, nickname, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = result.rows[0];
    res.render('profile', {
      title: 'Mein Profil',
      email: user.email,
      nickname: user.nickname,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Fehler beim Laden des Profils:', err.message);
    res.redirect('/dashboard');
  }
});

app.post('/profile/nickname', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const nickname = req.body.nickname.trim();
  try {
    await db.query('UPDATE users SET nickname = $1 WHERE id = $2', [nickname || null, req.session.userId]);
    res.redirect('/profile');
  } catch (err) {
    console.error('Fehler beim Speichern des Spitznamens:', err.message);
    res.redirect('/profile');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.post('/groups/create', async (req, res) => {
  const name = req.body.name;

  try {
    const result = await db.query(
        'INSERT INTO groups (name, owner_id) VALUES ($1, $2) RETURNING id',
        [name, req.session.userId]
    );
    const groupId = result.rows[0].id;
    await db.query(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [groupId, req.session.userId]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Fehler beim Erstellen:', err.message);
    res.redirect('/dashboard');
  }
});

app.get('/groups/:id', async (req, res) => {
  const groupId = req.params.id;

  if (!req.session.userId) {
    req.session.returnTo = '/groups/' + groupId;
    return res.redirect('/login');
  }

  try {
    const groupResult = await db.query(
      'SELECT * FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.render('dashboard', { title: 'Startseite', groups: [], error: 'Gruppe nicht gefunden.' });
    }

    const group = groupResult.rows[0];

    const memberCheck = await db.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, req.session.userId]
    );
    const isMember = memberCheck.rows.length > 0;

    const membersResult = await db.query(
      'SELECT COALESCE(users.nickname, users.username) AS display_name FROM users JOIN group_members ON users.id = group_members.user_id WHERE group_members.group_id = $1',
      [groupId]
    );

    res.render('group', {
      title: group.name,
      group,
      members: membersResult.rows,
      isMember,
      isOwner: group.owner_id === req.session.userId
    });
  } catch (err) {
    console.error('Fehler beim Laden der Gruppe:', err.message);
    res.redirect('/dashboard');
  }
});

app.post('/groups/:id/join', async (req, res) => {
  const groupId = req.params.id;

  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupId, req.session.userId]
    );
    res.redirect('/groups/' + groupId);
  } catch (err) {
    console.error('Fehler beim Beitreten:', err.message);
    res.redirect('/groups/' + groupId);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('finance läuft auf http://localhost:' + port);
});