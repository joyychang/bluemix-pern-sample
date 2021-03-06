/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const commentsRoutes = require('./server/routers/comments');

app.use(bodyParser.json());

// Emulating VCAP_VARIABLES if running in local mode
try { require("./vcap-local"); } catch (e) {}

const Sequelize = require('sequelize');
const sequelize = require('./server/utils/pg');
var session = require('express-session');

// initalize sequelize with session store
var SequelizeStore = require('connect-session-sequelize')(session.Store);

const Comment = sequelize.define('comment', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  author: Sequelize.STRING,
  text: Sequelize.STRING,
  twitter: Sequelize.STRING,
  imageURL: Sequelize.STRING
}, {
  timestamps: true,
  underscored: true
});

var Session = sequelize.define('Session', {
  sid: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  expires: Sequelize.DATE,
  data: Sequelize.STRING(50000),
  author: Sequelize.STRING,
  twitter: Sequelize.STRING,
  imageURL: Sequelize.STRING
});

// AppMetrics monitoring instrumentation
require('appmetrics-dash').attach();

app.use(session({
  store: new SequelizeStore({db: sequelize}),
  name: 'pern example',
  secret: 'keyboard cat',
  resave: false
}));


// Define public endpoints
app.use(express.static(__dirname + '/build'));

const useComment = (req, response, next) => {
  req.Comment = Comment;
  next();
};

app.use('/api/comments', useComment, commentsRoutes);

Comment.sync({force: true})
  .then(() => {
    // Make sure session table is createds
    return Session.sync()
  })
  .then(() => {
    // Starting the server
    const port = 'PORT' in process.env ? process.env.PORT : 8080;
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    })
  }).catch(function(err) {
  console.log(err);
  process.exit(1);
});