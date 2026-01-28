import { handleGetUser } from './get-user';

const express = require('express');

const app = express();
const port = 3000;

app.get('/users/:id', handleGetUser);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
